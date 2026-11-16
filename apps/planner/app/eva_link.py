"""Enlace EV1-IV entre dispositivos: un relevo de mensajes por sala, en memoria.

La web enlaza las ventanas del mismo navegador con BroadcastChannel; entre dispositivos (EV1 en
una computadora, IV en otra) los mensajes pasan por acá. El servidor no interpreta el contenido:
guarda los últimos mensajes de cada sala con un número de orden y los entrega por long polling.
Quien entra (o quedó atrás) saluda y las otras ventanas le mandan su estado, como en el navegador.

Todo input es malicioso: sala con formato fijo, mensajes con tope de tamaño, salas y mensajes
acotados (se descartan las más viejas). Un solo proceso: con varios workers no hay relevo.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from collections import deque
from dataclasses import dataclass, field

ROOM = re.compile(r"[A-Za-z0-9_-]{4,32}")
SENDER = re.compile(r"[A-Za-z0-9_-]{1,32}")
MAX_MESSAGE_BYTES = 200_000  # un snapshot (plan + plan previo + walkback) pesa ~30 kB
MAX_ROOMS = 200
KEEP_MESSAGES = 200  # ~50 s de pose a 4 Hz
ROOM_TTL_S = 6 * 3600
MAX_WAIT_S = 25.0


@dataclass
class Room:
    seq: int = 0
    messages: deque = field(default_factory=lambda: deque(maxlen=KEEP_MESSAGES))
    used: float = field(default_factory=time.monotonic)
    changed: asyncio.Event = field(default_factory=asyncio.Event)


class LinkError(ValueError):
    """Pedido inválido: la API responde 422 con este texto."""


class Relay:
    def __init__(self) -> None:
        self.rooms: dict[str, Room] = {}

    def _room(self, name: str) -> Room:
        if not ROOM.fullmatch(name):
            raise LinkError("Link code: 4 to 32 letters, digits, '-' or '_'")
        room = self.rooms.get(name)
        if room is None:
            self._evict()
            room = self.rooms[name] = Room()
        room.used = time.monotonic()
        return room

    def _evict(self) -> None:
        now = time.monotonic()
        for name in [n for n, r in self.rooms.items() if now - r.used > ROOM_TTL_S]:
            del self.rooms[name]
        while len(self.rooms) >= MAX_ROOMS:
            del self.rooms[min(self.rooms, key=lambda n: self.rooms[n].used)]

    def post(self, name: str, sender: str, message: dict) -> int:
        if not SENDER.fullmatch(sender):
            raise LinkError("Sender id: 1 to 32 letters, digits, '-' or '_'")
        if len(json.dumps(message, separators=(",", ":"))) > MAX_MESSAGE_BYTES:
            raise LinkError(f"Message larger than {MAX_MESSAGE_BYTES} bytes")
        room = self._room(name)
        room.seq += 1
        entry = {"seq": room.seq, "from": sender, "message": message}
        room.messages.append(entry)
        # Despierta a todos los que esperan y deja un evento nuevo para la próxima espera.
        room.changed.set()
        room.changed = asyncio.Event()
        return room.seq

    async def poll(self, name: str, after: int | None, wait_s: float) -> dict:
        """Mensajes con seq > after; si no hay, espera hasta wait_s a que llegue alguno.

        Sin `after` (quien recién entra): solo el seq actual. Si `after` quedó atrás de lo guardado
        o adelante del seq (el servidor reinició), `reset`: el cliente vuelve a saludar.
        """
        room = self._room(name)
        if after is None:
            return {"seq": room.seq, "messages": [], "reset": False}
        wait_s = max(0.0, min(wait_s, MAX_WAIT_S))
        if after == room.seq and wait_s > 0:
            try:
                await asyncio.wait_for(room.changed.wait(), timeout=wait_s)
            except TimeoutError:
                pass
            room.used = time.monotonic()
        oldest = room.messages[0]["seq"] if room.messages else room.seq + 1
        if after > room.seq or after < oldest - 1:
            return {"seq": room.seq, "messages": [], "reset": True}
        return {"seq": room.seq, "messages": [m for m in room.messages if m["seq"] > after],
                "reset": False}


relay = Relay()

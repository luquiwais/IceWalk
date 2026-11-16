"""Enlace EV1-IV entre dispositivos (`/link/{room}`): relevo con long polling."""

import asyncio

from fastapi.testclient import TestClient

from app import eva_link
from app.main import app

client = TestClient(app)


def _post(room, sender, message):
    return client.post(f"/link/{room}", json={"from": sender, "message": message})


def test_link_relays_in_order():
    room = "test-order"
    start = client.get(f"/link/{room}").json()
    assert start["messages"] == []
    seq0 = start["seq"]
    assert _post(room, "ev", {"type": "hello"}).status_code == 200
    _post(room, "ev", {"type": "state", "snapshot": {"rev": 1}})
    _post(room, "ev", {"type": "pose", "pose": {"x": 1}})
    got = client.get(f"/link/{room}", params={"after": seq0, "wait": 0}).json()
    assert [m["message"]["type"] for m in got["messages"]] == ["hello", "state", "pose"]
    assert all(m["from"] == "ev" for m in got["messages"]) and got["seq"] == seq0 + 3
    # Quien entra después (sin `after`) arranca desde ahora: saluda y le contestan.
    assert client.get(f"/link/{room}").json() == {"seq": got["seq"], "messages": [], "reset": False}
    # Al día y sin espera: nada nuevo.
    now = client.get(f"/link/{room}", params={"after": got["seq"], "wait": 0}).json()
    assert now["messages"] == []


def test_link_long_poll_wakes_on_a_new_message():
    async def run():
        relay = eva_link.Relay()
        seq = (await relay.poll("room-wait", None, 0))["seq"]
        waiting = asyncio.create_task(relay.poll("room-wait", seq, 5))
        await asyncio.sleep(0.05)
        assert not waiting.done()
        relay.post("room-wait", "iv", {"type": "presence"})
        got = await asyncio.wait_for(waiting, 1)
        assert [m["from"] for m in got["messages"]] == ["iv"]
        # Sin mensajes, la espera termina sola al vencer.
        empty = await relay.poll("room-wait", got["seq"], 0.05)
        assert empty["messages"] == [] and not empty["reset"]

    asyncio.run(run())


def test_link_resets_a_client_that_fell_behind_or_outlived_the_server():
    relay = eva_link.Relay()
    relay.post("room-gap", "ev", {"type": "state", "snapshot": {"rev": 7}})
    for _ in range(eva_link.KEEP_MESSAGES + 5):
        relay.post("room-gap", "ev", {"type": "pose"})
    behind = asyncio.run(relay.poll("room-gap", 1, 0))
    assert behind["reset"] and behind["messages"] == []
    ahead = asyncio.run(relay.poll("room-gap", 10_000, 0))
    assert ahead["reset"]


def test_link_validates_its_input():
    assert client.get("/link/x").status_code == 422  # sala muy corta
    assert client.get("/link/" + "a" * 40).status_code == 422
    assert client.get("/link/ab$d").status_code in (404, 422)
    assert _post("room-ok", "bad id!", {"type": "hello"}).status_code == 422
    assert client.post("/link/room-ok", json={"message": {}}).status_code == 422
    assert client.post("/link/room-ok", json=[1]).status_code == 422
    assert client.post("/link/room-ok", content=b"not json").status_code == 422
    assert _post("room-ok", "ev", "hello").status_code == 422
    big = {"type": "state", "blob": "x" * (eva_link.MAX_MESSAGE_BYTES + 10)}
    assert _post("room-ok", "ev", big).status_code in (413, 422)


def test_link_caps_the_number_of_rooms():
    relay = eva_link.Relay()
    for i in range(eva_link.MAX_ROOMS + 10):
        relay.post(f"room-{i:04d}", "ev", {"type": "hello"})
    assert len(relay.rooms) <= eva_link.MAX_ROOMS
    assert "room-0000" not in relay.rooms and f"room-{eva_link.MAX_ROOMS + 9:04d}" in relay.rooms

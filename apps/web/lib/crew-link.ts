import { validRoom } from "./use-eva-link";

const KEY = "icewalk-crew-link";
/** No 0/O or 1/I/L: the code is read aloud or typed on another device. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * The crew link code of this browser: the one in the URL (`?link=K7Q2MX`, a window opened from
 * another device's link), else the one this browser already uses, else a new one. It is kept, so
 * a reload stays on the same link.
 */
export function crewLink(fromUrl: string | null | undefined, storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage()): string {
  const code = validRoom(fromUrl?.trim().toUpperCase()) ?? validRoom(storage?.getItem(KEY)) ?? newCode();
  try { storage?.setItem(KEY, code); } catch { /* private mode */ }
  return code;
}

function newCode(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function safeStorage() {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

/** The URL that opens this EVA in a seat, here or on another device. */
export function seatUrl(origin: string, path: string, role: string, code: string | null): string {
  const q = new URLSearchParams({ phase: "eva", role });
  if (code) q.set("link", code);
  return `${origin}${path}?${q}`;
}

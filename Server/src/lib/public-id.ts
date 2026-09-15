import { randomInt } from "node:crypto";

// Context.md §5.2: 7 characters from an unambiguous alphabet — no 0/O, no 1/I/l.
// 31 symbols ^ 7 ≈ 27.5 billion IDs; collisions are handled by the caller retrying.
export const PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const PUBLIC_ID_LENGTH = 7;

export function generatePublicId(): string {
  let id = "";
  for (let i = 0; i < PUBLIC_ID_LENGTH; i++) {
    id += PUBLIC_ID_ALPHABET[randomInt(PUBLIC_ID_ALPHABET.length)];
  }
  return id;
}

const PUBLIC_ID_RE = new RegExp(`^[${PUBLIC_ID_ALPHABET}]{${PUBLIC_ID_LENGTH}}$`);

/** Accepts "7K2M9QX", "#7K2M9QX" or lowercase; returns the canonical stored form or null. */
export function normalizePublicId(input: string): string | null {
  const id = input.trim().replace(/^#/, "").toUpperCase();
  return PUBLIC_ID_RE.test(id) ? id : null;
}

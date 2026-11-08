import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt settings. Stored hashes look like: scrypt-v1$<salt hex>$<key hex>
const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEY_LENGTH = 64;
const STORED_HASH_FORMAT = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt-v1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = STORED_HASH_FORMAT.exec(storedHash);
  if (!parts) {
    await runFakePasswordCheck(password);
    return false;
  }
  const actualKey = await deriveKey(password, Buffer.from(parts[1], "hex"));
  return timingSafeEqual(actualKey, Buffer.from(parts[2], "hex"));
}

/**
 * Spends the same time as a real check. Used when the email does not exist,
 * so an attacker cannot tell "unknown email" from "wrong password" by timing.
 */
export async function runFakePasswordCheck(password: string): Promise<void> {
  await deriveKey(password, Buffer.alloc(16));
}

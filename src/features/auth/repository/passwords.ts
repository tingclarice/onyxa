import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "../types/auth";

const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
export const passwords: PasswordHasher = {
  async hash(password) {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt-v1$${salt.toString("hex")}$${key.toString("hex")}`;
  },
  async verify(password, encoded) {
    const parts = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
    if (!parts) {
      await passwords.dummyVerify(password);
      return false;
    }
    const actual = await derive(password, Buffer.from(parts[1], "hex"));
    return timingSafeEqual(actual, Buffer.from(parts[2], "hex"));
  },
  async dummyVerify(password) {
    await derive(password, Buffer.alloc(16));
  },
};

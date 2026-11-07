import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { InvitationSecrets } from "../types/business";

export const invitationSecrets: InvitationSecrets = {
  hash(code) {
    return createHash("sha256").update(code).digest("hex");
  },
  issue() {
    const code = randomBytes(32).toString("hex");
    return { code, hash: invitationSecrets.hash(code) };
  },
};

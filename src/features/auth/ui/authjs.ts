import "server-only";
import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "../services/authentication";
import { createAccountRepository } from "../repository/prisma-accounts";
import { passwords } from "../repository/passwords";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/masuk", error: "/masuk" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authenticate(
          credentials,
          new Date(),
          createAccountRepository(),
          passwords,
        ),
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  logger: {
    // Provider errors may contain request data; log only the category.
    error(error) {
      console.error("[auth] session request failed", {
        type: error instanceof AuthError ? error.type : "UnexpectedError",
      });
    },
  },
});

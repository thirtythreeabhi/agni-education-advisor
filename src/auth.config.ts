import type { NextAuthConfig } from "next-auth";

// Edge-safe configuration used by middleware. Node-only credential verification
// and database access remain in src/auth.ts and server routes.
export default {
  providers: [],
  pages: { signIn: "/login" },
  callbacks: { authorized: ({ auth }) => Boolean(auth?.user) },
} satisfies NextAuthConfig;

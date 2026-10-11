import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { normalizeIdentifier } from "@/lib/identifiers";
import { dummyPasswordHash, verifyPassword } from "@/lib/passwords";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import authConfig from "@/auth.config";

const INVALID_CREDENTIALS = "Invalid identifier or password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: { identifier: {}, password: {} },
    async authorize(credentials) {
      const identifier = typeof credentials?.identifier === "string" ? normalizeIdentifier(credentials.identifier) : null;
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      const rateKey = createHash("sha256").update(`login:${credentials?.identifier ?? "invalid"}`).digest("hex");
      await enforceAuthRateLimit(rateKey, 10);
      const [user] = identifier
        ? await getDb().select().from(users).where(eq(identifier.type === "email" ? users.email : users.phone, identifier.value)).limit(1)
        : [];
      const valid = await verifyPassword(user?.passwordHash ?? await dummyPasswordHash, password).catch(() => false);
      if (!user || !valid || !user.isActive) throw new Error(INVALID_CREDENTIALS);
      return { id: user.id, role: user.role, sessionVersion: user.sessionVersion };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.userId) return token;
      const [current] = await getDb().select({ isActive: users.isActive, role: users.role, sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, token.userId)).limit(1);
      if (!current || !current.isActive || current.sessionVersion !== token.sessionVersion) return {};
      token.role = current.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.user.role = token.role as "admin" | "user";
      }
      return session;
    },
  },
});

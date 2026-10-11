import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User { role: "admin" | "user"; sessionVersion: number; }
  interface Session { user: { id: string; role: "admin" | "user" } & DefaultSession["user"]; }
}

declare module "next-auth/jwt" {
  interface JWT { userId?: string; role?: "admin" | "user"; sessionVersion?: number; }
}

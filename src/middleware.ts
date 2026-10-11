import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  if (!request.auth) return NextResponse.redirect(new URL("/login", request.url));
});

export const config = { matcher: ["/consultations(.*)", "/api/consultations(.*)"] };

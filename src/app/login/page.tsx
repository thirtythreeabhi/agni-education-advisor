"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { identifier: data.get("identifier"), password: data.get("password"), redirect: false });
    if (!result || result.error) { setError("Invalid identifier or password."); setBusy(false); return; }
    window.location.assign("/consultations");
  }
  return <main className="shell"><div className="card" style={{maxWidth: 440, margin: "60px auto"}}><p className="muted">Agni Education Advisor</p><h1>Log in</h1><form className="grid" onSubmit={submit}><label> Email or phone<input name="identifier" required autoComplete="username" /></label><label>Password<div className="password-row"><input name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div></label>{error && <p role="alert">{error}</p>}<button disabled={busy} type="submit">{busy ? "Logging in…" : "Log in"}</button></form><p className="muted">No account? <Link href="/register">Register</Link></p></div></main>;
}

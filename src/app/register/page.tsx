"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), phone: data.get("phone"), password: data.get("password") }) });
      if (!response.ok) { setError("Unable to create account. Check the details or try again later."); setBusy(false); return; }
      window.location.assign("/login");
    } catch { setError("Unable to reach the registration service. Try again."); setBusy(false); }
  }
  return <main className="shell"><div className="card" style={{maxWidth: 440, margin: "60px auto"}}><p className="muted">Agni Education Advisor</p><h1>Create account</h1><p className="muted">Provide an email or phone number. Contact ownership is not verified yet.</p><form className="grid" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" /></label><label>Phone<input name="phone" placeholder="+91 9876543210" autoComplete="tel" /></label><label>Password<div className="password-row"><input name="password" type={showPassword ? "text" : "password"} minLength={12} required autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div></label>{error && <p role="alert">{error}</p>}<button disabled={busy} type="submit">{busy ? "Creating…" : "Create account"}</button></form><p className="muted">Already registered? <Link href="/login">Log in</Link></p></div></main>;
}

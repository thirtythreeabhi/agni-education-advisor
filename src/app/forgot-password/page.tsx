"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email") }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error ?? "Unable to start password recovery.");
      else setMessage(body.message);
    } catch { setError("Unable to reach the password recovery service. Try again."); }
    setBusy(false);
  }

  return <main className="shell"><div className="card" style={{maxWidth: 440, margin: "60px auto"}}><p className="muted">Agni Education Advisor</p><h1>Forgot password?</h1><p className="muted">Enter the verified email address on your account and we’ll send a reset link.</p><form className="grid" onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="email" /></label>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link"}</button></form><p className="muted"><Link href="/login">Back to log in</Link></p></div></main>;
}

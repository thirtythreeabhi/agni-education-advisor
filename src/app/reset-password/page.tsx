"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) { setError("Passwords do not match."); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: data.get("password") }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error ?? "Invalid or expired reset link."); else setDone(true);
    } catch { setError("Unable to reach the password reset service. Try again."); }
    setBusy(false);
  }

  return <main className="shell"><div className="card" style={{maxWidth: 440, margin: "60px auto"}}><p className="muted">Agni Education Advisor</p><h1>Set a new password</h1>{done ? <><p role="status">Your password has been reset. You can now log in.</p><Link className="primary-link" href="/login">Go to log in</Link></> : <form className="grid" onSubmit={submit}><label>New password<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label>{error && <p role="alert">{error}</p>}<button disabled={busy || !token} type="submit">{busy ? "Resetting…" : "Reset password"}</button>{!token && <p role="alert">This reset link is invalid.</p>}</form>}<p className="muted"><Link href="/login">Back to log in</Link></p></div></main>;
}

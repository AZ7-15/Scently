"use client";
import { useState, type FormEvent } from "react";
import Link from "./site-link";
import { api } from "./shell";

export function RecoverPassword() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) {
      setError("The new passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await api<{ message: string }>("/api/auth", {
        action: "recover-password",
        email: values.email,
        recoveryKey: values.recoveryKey,
        newPassword: values.newPassword,
      });
      setMessage(result.message);
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <h1>Reset your password</h1>
      <p>Enter your email and the private recovery key configured by the site owner.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Recovery key
          <input name="recoveryKey" type="password" autoComplete="off" required maxLength={256} />
        </label>
        <label>
          New password
          <input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        </label>
        {error && <p className="info-line" role="alert">{error}</p>}
        {message && <p className="info-line" role="status">{message}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "Updating…" : "Reset password"}
        </button>
      </form>
      <Link className="text-link auth-switch" href="/login">Back to sign in</Link>
    </section>
  );
}

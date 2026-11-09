"use client";
import { useState, type FormEvent } from "react";
import { api } from "./shell";

export function ChangePassword() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) {
      setError("The new passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      await api("/api/auth", {
        action: "change-password",
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      setMessage("Your password has been changed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <h2>Change password</h2>
      <p>Choose a new password with at least 12 characters.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Current password
          <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} />
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
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

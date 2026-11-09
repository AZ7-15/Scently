"use client";
import { useState, type FormEvent } from "react";
import { api } from "./shell";
export function Login({ returnTo }: { returnTo: string }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const result = await api<{ redirectTo: string }>("/api/auth", {
        ...data,
        action: register ? "register" : "login",
        returnTo,
      });
      window.location.assign(result.redirectTo);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="panel auth-panel">
      <h1>{register ? "Create your Scently account" : "Welcome back"}</h1>
      <p>Save your collection and share your fragrance experiences.</p>
      <form onSubmit={submit} className="auth-form">
        {register && (
          <label>
            Display name
            <input
              name="name"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={60}
            />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 12 : 1}
            maxLength={128}
          />
        </label>
        {register && (
          <p className="quiet-note">
            Use at least 12 characters. Your display name appears beside your
            reviews.
          </p>
        )}
        {error && (
          <p role="alert" className="info-line">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="text-link auth-switch"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have an account? Sign in"
          : "New to Scently? Create an account"}
      </button>
    </section>
  );
}

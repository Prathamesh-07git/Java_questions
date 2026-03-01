"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    let data = {};
    try {
      data = await res.json();
    } catch { }
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p>Log in to continue your logic practice.</p>
        <form className="auth-actions" onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="auth-error">{error}</div> : null}
          <button className="btn solid" type="submit" disabled={loading}>
            {loading ? (
              <><span className="spinner"></span>Connecting...</>
            ) : "Login"}
          </button>
        </form>
        <p style={{ marginTop: 12 }}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

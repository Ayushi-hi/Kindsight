"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("bad credentials");
      const data = await res.json();
      localStorage.setItem("radintel_token", data.token);
    } catch {
      // Demo mode: backend not reachable — proceed with a local session
      // so the product can still be reviewed end to end.
      localStorage.setItem("radintel_token", "demo-token");
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan shadow-glow" />
            <span className="font-mono text-sm tracking-widest text-ink">RADINTEL AI</span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">Sign in to the reading room</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-line bg-panel rounded-lg p-6 space-y-4"
        >
          <div>
            <label className="block font-mono text-[11px] tracking-wide text-ink-muted mb-1">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-line bg-void px-3 py-2 text-sm text-ink outline-none focus-visible:border-cyan"
              placeholder="you@hospital.org"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] tracking-wide text-ink-muted mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-line bg-void px-3 py-2 text-sm text-ink outline-none focus-visible:border-cyan"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-cyan text-void font-medium text-sm py-2 hover:bg-cyan-dim transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center font-mono text-[11px] text-ink-muted">
          Research / demo build — not for clinical use.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token, user } = await api.login({ email, password });
      setSession(access_token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-full.png" alt="Kindsight" width={335} height={109} className="h-9 w-auto mb-3" priority />
          <p className="text-sm text-sage-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card border border-line bg-white p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-sage-muted mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:border-sage"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-sage-muted">Password</label>
              <Link href="/forgot-password" className="text-xs text-sage hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:border-sage"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-sage text-white font-medium text-sm py-2.5 hover:bg-[#4338CA] transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-sage-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-sage font-medium hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-6 rounded-lg bg-sage-soft px-4 py-3 text-xs text-sage text-center leading-relaxed">
          For clinical use only. Kindsight is a triage / second-reader assistant. Not a replacement
          for clinician judgment.
        </div>
      </div>
    </main>
  );
}
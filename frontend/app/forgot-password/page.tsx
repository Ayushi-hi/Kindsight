"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo-full.png" alt="Kindsight" width={160} height={40} className="h-10 w-auto" priority />
        </div>

        <div className="rounded-card border border-line bg-white p-6">
          <Link href="/login" className="flex items-center gap-2 text-sm text-sage-muted hover:text-ink transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to login
          </Link>

          <h1 className="font-display text-lg text-ink mb-2">Forgot your password?</h1>

          {submitted ? (
            <p className="text-sm text-sage-muted">
              If an account exists for <span className="text-ink">{email}</span>, we&apos;ve sent a link to
              reset your password. Check your inbox (and spam folder).
            </p>
          ) : (
            <>
              <p className="text-sm text-sage-muted mb-4">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:border-sage"
                />
                {error && <p className="text-sm text-clay">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-sage text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
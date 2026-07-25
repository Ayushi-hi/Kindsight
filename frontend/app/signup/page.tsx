"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { access_token, user } = await api.register({ email, password, full_name: fullName });
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
          <p className="text-sm text-sage-muted">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card border border-line bg-white p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-sage-muted mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:border-sage"
              placeholder="Dr. Jane Smith"
            />
          </div>
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
            <label className="block text-xs font-medium text-sage-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:border-sage"
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-sage text-white font-medium text-sm py-2.5 hover:bg-[#4338CA] transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-sage-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-sage font-medium hover:underline">
            Sign in
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
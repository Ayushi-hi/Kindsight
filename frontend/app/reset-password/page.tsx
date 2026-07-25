"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.resetPassword({ token, new_password: newPassword });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
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
          <h1 className="font-display text-lg text-ink mb-2">Set a new password</h1>

          {!token ? (
            <p className="text-sm text-clay">
              This link is missing a reset token. Request a new one from the{" "}
              <Link href="/forgot-password" className="text-sage underline">
                forgot password
              </Link>{" "}
              page.
            </p>
          ) : done ? (
            <p className="flex items-center gap-2 text-sm text-sage">
              <Check className="h-4 w-4" strokeWidth={2} />
              Password updated. Redirecting to login...
            </p>
          ) : (
            <>
              <p className="text-sm text-sage-muted mb-4">Choose a new password for your account.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:border-sage"
                />
                <p className="text-xs text-sage-muted">At least 8 characters.</p>
                {error && <p className="text-sm text-clay">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || newPassword.length < 8}
                  className="w-full rounded-full bg-sage text-white py-2 text-sm font-medium disabled:opacity-40 hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadDropzone } from "@/components/UploadDropzone";
import { AppShell } from "@/components/AppShell";
import { ScanText, Sparkles, MessageCircle } from "lucide-react";
import { api, ApiError, type ScanOut } from "@/lib/api";
import { getStoredUser, initials, type StoredUser } from "@/lib/auth";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const screeningTypeLabel: Record<string, { label: string; className: string }> = {
  single: { label: "Pneumonia", className: "bg-sage-soft text-sage" },
  multilabel: { label: "14-Condition", className: "bg-clay-soft text-clay" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<ScanOut[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);

  useEffect(() => {
    api
      .listScans(10)
      .then((res) => setRecentScans(res.scans))
      .catch(() => {
        // Backend unreachable or no scans yet - just show an empty state below
      })
      .finally(() => setLoadingScans(false));
  }, []);

  const handleContinue = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const { scan_id } = await api.uploadScan(file);
      router.push(`/scan/${scan_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Try again.");
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <header className="border-b border-line bg-white">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <Image src="/logo-full.png" alt="Kindsight" width={335} height={109} className="h-7 w-auto" priority />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-sage-muted">Chest X-ray · Pneumonia review</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-white text-xs font-medium">
              {user ? initials(user.full_name) : "…"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8">
        <section className="pt-12 pb-8 flex items-start justify-between gap-8">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl leading-tight text-ink">
              A second look at every chest X-ray, <span className="text-sage">in seconds.</span>
            </h1>
            <p className="mt-3 text-sage-muted max-w-md">
              Upload a scan to get a pneumonia read, a highlighted region of interest, and a
              plain-language summary you can talk through with the assistant.
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-sage-soft shrink-0 overflow-hidden">
            <Image src="/logo-mark.png" alt="Kindsight" width={98} height={109} className="h-14 w-auto" />
          </div>
        </section>

        <section className="pb-16">
          <UploadDropzone onFileSelected={setFile} uploading={uploading} />
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
          {file && !uploading && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleContinue}
                className="rounded-full bg-sage text-white px-6 py-2.5 font-medium hover:bg-[#4338CA] transition-colors"
              >
                Review this scan
              </button>
            </div>
          )}
        </section>

        <section className="pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<ScanText className="h-5 w-5" strokeWidth={1.5} />}
              title="Detection + region highlight"
              description="EfficientNet flags pneumonia likelihood; Grad-CAM shows exactly where."
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" strokeWidth={1.5} />}
              title="Plain-language report"
              description="Findings and impression written in language a patient can follow too."
            />
            <FeatureCard
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.5} />}
              title="Ask about the result"
              description="Chat grounded in medical literature, with sources for every claim."
            />
          </div>
        </section>

        {!loadingScans && recentScans.length > 0 && (
          <section className="pb-20">
            <h2 className="font-display text-lg text-ink mb-4">Recent scans</h2>
            <div className="rounded-card border border-line bg-white divide-y divide-line">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-sage-soft/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/scan/${scan.id}`)}
                >
                  <div>
                    <p className="font-medium text-ink">Chest X-ray</p>
                    <p className="text-sm text-sage-muted">{formatDate(scan.uploaded_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {scan.screening_types && scan.screening_types.length > 0 ? (
                      scan.screening_types.map((type) => {
                        const info = screeningTypeLabel[type] ?? { label: type, className: "bg-sage-soft text-sage" };
                        return (
                          <span
                            key={type}
                            className={`text-sm px-3 py-1 rounded-full ${info.className}`}
                          >
                            {info.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-sm text-sage-muted bg-sage-soft/60 px-3 py-1 rounded-full">
                        Not yet screened
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="pb-10">
          <p className="text-xs text-sage-muted border-t border-line pt-4">
            Always correlate with clinical findings and other investigations. This tool is not a
            replacement for professional clinical judgment.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="text-sage mb-3">{icon}</div>
      <p className="font-medium text-ink mb-1">{title}</p>
      <p className="text-sm text-sage-muted leading-relaxed">{description}</p>
    </div>
  );
}

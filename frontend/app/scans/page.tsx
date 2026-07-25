"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { api, toFileUrl, ApiError, type ScanOut } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusStyles: Record<string, string> = {
  uploaded: "bg-sage-soft text-sage",
  processing: "bg-sage-soft text-sage",
  done: "bg-sage-soft text-sage",
  failed: "bg-clay-soft text-clay",
};

const statusLabel: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  done: "Completed",
  failed: "Failed",
};

function PredictionCell({ label, confidence }: { label?: string | null; confidence?: number | null }) {
  if (!label || confidence == null) {
    return <span className="text-sm text-sage-muted">Not yet screened</span>;
  }
  const isPneumonia = label === "pneumonia";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        isPneumonia ? "bg-clay-soft text-clay" : "bg-sage-soft text-sage",
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", isPneumonia ? "bg-clay" : "bg-sage"].join(" ")} />
      {isPneumonia ? "Pneumonia likely" : "Pneumonia unlikely"}
    </span>
  );
}

function ConfidenceCell({ confidence }: { confidence?: number | null }) {
  if (confidence == null) return <span className="text-sm text-sage-muted">-</span>;
  const pct = confidence * 100;
  return (
    <div className="w-28">
      <div className="flex items-center justify-between text-xs text-ink mb-1">
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default function RecentScansPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listScansPage(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setScans(res.scans);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load scans.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToScan(scan: ScanOut) {
    if (scan.screening_types?.includes("multilabel") && !scan.screening_types?.includes("single")) {
      router.push(`/scan-multi/${scan.id}`);
    } else {
      router.push(`/scan/${scan.id}`);
    }
  }

  return (
    <AppShell>
      <header className="border-b border-line bg-white">
        <div className="px-8 py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-sage-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back
          </button>
          <p className="font-display text-base text-ink">Recent Scans</p>
          <span className="text-sm text-sage-muted w-16 text-right">
            {total > 0 ? `${total} total` : ""}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {error && (
          <div className="rounded-card border border-clay-soft bg-clay-soft/40 px-4 py-3 text-sm text-clay mb-4">
            {error}
          </div>
        )}

        <div className="rounded-card border border-line bg-white overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs text-sage-muted uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Scan</th>
                <th className="px-5 py-3 font-medium">Prediction</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="h-5 w-5 text-sage animate-spin mx-auto" />
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-sage-muted">
                    No scans yet. Upload one from the Dashboard to get started.
                  </td>
                </tr>
              ) : (
                scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-sage-soft/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toFileUrl(scan.preview_url)}
                          alt="Chest X-ray thumbnail"
                          className="h-10 w-10 rounded-md object-cover bg-[#0f0f10]"
                        />
                        <div>
                          <p className="text-sm font-medium text-ink">Chest X-ray</p>
                          <p className="text-xs text-sage-muted uppercase">{scan.modality.replace("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <PredictionCell label={scan.label} confidence={scan.confidence} />
                    </td>
                    <td className="px-5 py-4">
                      <ConfidenceCell confidence={scan.confidence} />
                    </td>
                    <td className="px-5 py-4 text-sm text-sage-muted">{formatDate(scan.uploaded_at)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[scan.status] ?? "bg-sage-soft text-sage"}`}
                      >
                        {statusLabel[scan.status] ?? scan.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => goToScan(scan)}
                        className="inline-flex items-center gap-1.5 text-sm text-sage hover:text-[#4338CA] transition-colors"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.75} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-sage-muted px-3 py-1.5 rounded-md hover:bg-sage-soft hover:text-sage disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "ellipsis" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-sm text-sage-muted">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={[
                      "h-8 w-8 rounded-md text-sm transition-colors",
                      p === page ? "bg-sage text-white font-medium" : "text-sage-muted hover:bg-sage-soft",
                    ].join(" ")}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-sage-muted px-3 py-1.5 rounded-md hover:bg-sage-soft hover:text-sage disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { api, toFileUrl, ApiError, type ReportListItem } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const severityStyles: Record<string, string> = {
  none: "bg-sage-soft text-sage",
  mild: "bg-sage-soft text-sage",
  moderate: "bg-clay-soft text-clay",
  significant: "bg-clay-soft text-clay",
  severe: "bg-clay-soft text-clay",
};

function TypeBadge({ type }: { type: "single" | "multilabel" }) {
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sage-soft text-sage">
      {type === "single" ? "Pneumonia Screening" : "14-Condition Screening"}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listReports(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setReports(res.reports);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load reports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToReport(report: ReportListItem) {
    if (report.report_type === "multilabel") {
      router.push(`/scan-multi/${report.scan_id}`);
    } else {
      router.push(`/scan/${report.scan_id}`);
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
          <p className="font-display text-base text-ink">Reports</p>
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
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Impression</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Generated</th>
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
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-sage-muted">
                    No reports yet. Generate one from a scan's result page.
                  </td>
                </tr>
              ) : (
                reports.map((report, idx) => (
                  <tr key={`${report.scan_id}-${report.report_type}-${idx}`} className="hover:bg-sage-soft/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {report.preview_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toFileUrl(report.preview_url)}
                            alt="Chest X-ray thumbnail"
                            className="h-10 w-10 rounded-md object-cover bg-[#0f0f10]"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-[#0f0f10]" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-ink">Chest X-ray</p>
                          <p className="text-xs text-sage-muted uppercase">
                            {report.modality ? report.modality.replace("_", " ") : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <TypeBadge type={report.report_type} />
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-sm text-ink truncate">{report.impression}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                          severityStyles[report.severity] ?? "bg-sage-soft text-sage"
                        }`}
                      >
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-sage-muted">{formatDate(report.generated_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => goToReport(report)}
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
                    …
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
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft, Download } from "lucide-react";
import {
  api,
  toFileUrl,
  ApiError,
  type ScanOut,
  type PredictionMultiOut,
  type ReportMultiOut,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { MultiHeatmapViewer } from "@/components/MultiHeatmapViewer";
import { FindingsBadgeList } from "@/components/FindingsBadgeList";
import { MultiReportCard } from "@/components/MultiReportCard";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { KeyFindings } from "@/components/KeyFindings";
import { ChatWindow } from "@/components/ChatWindow";

type Stage = "loading" | "predicting" | "reporting" | "ready" | "error";

const severityLabel: Record<ReportMultiOut["severity"], string> = {
  none: "No findings",
  moderate: "Moderate",
  significant: "Significant",
};

export default function MultiScanResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scanId = params.id;

  const [stage, setStage] = useState<Stage>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanOut | null>(null);
  const [prediction, setPrediction] = useState<PredictionMultiOut | null>(null);
  const [report, setReport] = useState<ReportMultiOut | null>(null);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const scanData = await api.getScan(scanId);
        if (cancelled) return;
        setScan(scanData);

        let predictionData: PredictionMultiOut;
        try {
          predictionData = await api.getMultiPrediction(scanId);
        } catch {
          setStage("predicting");
          predictionData = await api.runMultiPrediction(scanId);
        }
        if (cancelled) return;
        setPrediction(predictionData);
        setActiveCondition(predictionData.findings[0]?.condition ?? null);

        let reportData: ReportMultiOut;
        try {
          reportData = await api.getMultiReport(scanId);
        } catch {
          setStage("reporting");
          reportData = await api.createMultiReport(scanId);
        }
        if (cancelled) return;
        setReport(reportData);

        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Something went wrong loading this screening.";
        setErrorMessage(message);
        setStage("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  if (stage === "error") {
    return (
      <AppShell>
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <AlertCircle className="h-8 w-8 text-clay mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-medium text-ink mb-1">Couldn&apos;t load this screening</p>
            <p className="text-sm text-sage-muted mb-5">{errorMessage}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-full bg-sage text-white px-5 py-2 text-sm font-medium hover:bg-[#4338CA] transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </main>
      </AppShell>
    );
  }

  if (stage === "loading" || stage === "predicting" || stage === "reporting") {
    const label =
      stage === "loading"
        ? "Loading scan…"
        : stage === "predicting"
          ? "Screening across 14 conditions…"
          : "Generating report…";
    return (
      <AppShell>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-sage animate-spin mx-auto mb-3" />
            <p className="text-sm text-sage-muted">{label}</p>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!scan || !prediction || !report) return null;

  const findingsWithFullUrls = prediction.findings.map((f) => ({
    ...f,
    gradcam_full_url: toFileUrl(f.gradcam_url),
  }));
  const isNormal = report.severity === "none";

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
          <p className="font-display text-base text-ink">14-Condition Screening</p>
          <button className="flex items-center gap-2 text-sm text-sage border border-line rounded-full px-4 py-1.5 hover:bg-sage-soft transition-colors">
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            Download Report
          </button>
        </div>
      </header>

      <section className="px-8 pt-6">
        <div className="max-w-6xl mx-auto rounded-card border border-line bg-sage-soft/40 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Just checking for pneumonia?</p>
            <p className="text-sm text-sage-muted">
              Switch to the focused pneumonia read for this same scan.
            </p>
          </div>
          <button
            onClick={() => router.push(`/scan/${scanId}`)}
            className="rounded-full bg-sage text-white px-5 py-2 text-sm font-medium hover:bg-[#4338CA] transition-colors whitespace-nowrap"
          >
            View pneumonia-only read
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 pt-6">
        <FindingsBadgeList
          findings={prediction.findings}
          activeCondition={activeCondition}
          onSelect={setActiveCondition}
        />
      </section>

      <section className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <MultiHeatmapViewer
          originalUrl={toFileUrl(scan.preview_url)}
          findings={findingsWithFullUrls}
        />

        <div className="space-y-6">
          <div className="rounded-card border border-line bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-base text-ink">Screening Analysis</p>
              <span
                className={[
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  isNormal ? "bg-sage-soft text-sage" : "bg-clay-soft text-clay",
                ].join(" ")}
              >
                {severityLabel[report.severity]}
              </span>
            </div>

            {prediction.findings.length > 0 ? (
              <div className="space-y-3.5">
                <p className="text-xs font-medium text-sage-muted uppercase tracking-wide">
                  Flagged Conditions
                </p>
                {prediction.findings.map((f) => (
                  <ProbabilityBar
                    key={f.condition}
                    label={f.condition.replace("_", " ")}
                    percent={f.confidence * 100}
                    tone="clay"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-sage-muted">
                No conditions crossed the screening threshold across all 14 categories.
              </p>
            )}
          </div>

          <KeyFindings findings={report.findings} impression={report.impression} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <MultiReportCard report={report} />
        <ChatWindow scanId={scanId} />
      </section>
    </AppShell>
  );
}

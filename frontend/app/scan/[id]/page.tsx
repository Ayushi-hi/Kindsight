"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { api, toFileUrl, ApiError, type ScanOut, type PredictionOut, type ReportOut } from "@/lib/api";
import { HeatmapViewer } from "@/components/HeatmapViewer";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ReportCard } from "@/components/ReportCard";
import { ChatWindow } from "@/components/ChatWindow";

type Stage = "loading" | "predicting" | "reporting" | "ready" | "error";

export default function ScanResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scanId = params.id;

  const [stage, setStage] = useState<Stage>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanOut | null>(null);
  const [prediction, setPrediction] = useState<PredictionOut | null>(null);
  const [report, setReport] = useState<ReportOut | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const scanData = await api.getScan(scanId);
        if (cancelled) return;
        setScan(scanData);

        // Try to reuse an existing prediction/report (e.g. revisiting this
        // scan later) before running inference again from scratch.
        let predictionData: PredictionOut;
        try {
          predictionData = await api.getPrediction(scanId);
        } catch {
          setStage("predicting");
          predictionData = await api.runPrediction(scanId);
        }
        if (cancelled) return;
        setPrediction(predictionData);

        let reportData: ReportOut;
        try {
          reportData = await api.getReport(scanId);
        } catch {
          setStage("reporting");
          reportData = await api.createReport(scanId);
        }
        if (cancelled) return;
        setReport(reportData);

        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong loading this scan.";
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
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-8 w-8 text-clay mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium text-ink mb-1">Couldn&apos;t load this scan</p>
          <p className="text-sm text-sage-muted mb-5">{errorMessage}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-sage text-white px-5 py-2 text-sm font-medium hover:bg-[#4b5b4b] transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (stage === "loading" || stage === "predicting" || stage === "reporting") {
    const label =
      stage === "loading"
        ? "Loading scan…"
        : stage === "predicting"
          ? "Analyzing your X-ray…"
          : "Generating report…";
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-sage animate-spin mx-auto mb-3" />
          <p className="text-sm text-sage-muted">{label}</p>
        </div>
      </main>
    );
  }

  if (!scan || !prediction || !report) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-sage-muted hover:text-ink transition-colors"
          >
            ← Back
          </button>
          <ConfidenceBadge label={prediction.label} confidence={prediction.confidence} />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="rounded-card border border-line bg-sage-soft/40 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Want a broader read?</p>
            <p className="text-sm text-sage-muted">
              Screen this same scan across 14 possible chest conditions, not just pneumonia.
            </p>
          </div>
          <button
            onClick={() => router.push(`/scan-multi/${scanId}`)}
            className="rounded-full bg-sage text-white px-5 py-2 text-sm font-medium hover:bg-[#4b5b4b] transition-colors whitespace-nowrap"
          >
            Run full screening
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <HeatmapViewer
            originalUrl={toFileUrl(scan.preview_url)}
            gradcamUrl={prediction.gradcam_url ? toFileUrl(prediction.gradcam_url) : null}
          />
          <ReportCard report={report} />
        </div>
        <div>
          <ChatWindow scanId={scanId} />
        </div>
      </section>
    </main>
  );
}
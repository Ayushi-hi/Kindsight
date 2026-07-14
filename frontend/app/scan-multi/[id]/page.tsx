"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import {
  api,
  toFileUrl,
  ApiError,
  type ScanOut,
  type PredictionMultiOut,
  type ReportMultiOut,
} from "@/lib/api";
import { MultiHeatmapViewer } from "@/components/MultiHeatmapViewer";
import { FindingsBadgeList } from "@/components/FindingsBadgeList";
import { MultiReportCard } from "@/components/MultiReportCard";
import { ChatWindow } from "@/components/ChatWindow";

type Stage = "loading" | "predicting" | "reporting" | "ready" | "error";

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
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-8 w-8 text-clay mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium text-ink mb-1">Couldn&apos;t load this screening</p>
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
          ? "Screening across 14 conditions…"
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

  const findingsWithFullUrls = prediction.findings.map((f) => ({
    ...f,
    gradcam_full_url: toFileUrl(f.gradcam_url),
  }));

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-sm text-sage-muted hover:text-ink transition-colors"
            >
              ← Back
            </button>
            <span className="text-sm text-sage-muted">14-condition screening</span>
          </div>
          <FindingsBadgeList
            findings={prediction.findings}
            activeCondition={activeCondition}
            onSelect={setActiveCondition}
          />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <MultiHeatmapViewer
            originalUrl={toFileUrl(scan.preview_url)}
            findings={findingsWithFullUrls}
          />
          <MultiReportCard report={report} />
        </div>
        <div>
          <ChatWindow scanId={scanId} />
        </div>
      </section>
    </main>
  );
}
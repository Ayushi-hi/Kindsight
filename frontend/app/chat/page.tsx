"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { api, toFileUrl, ApiError, type ScanOut } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ChatWindow } from "@/components/ChatWindow";
import { useRouter } from "next/navigation";

export default function ChatAssistantPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listScansPage(1, 25)
      .then((res) => {
        if (cancelled) return;
        setScans(res.scans);
        // Default to the most recently uploaded scan.
        if (res.scans.length > 0) {
          setSelectedScanId(res.scans[0].id);
        }
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
  }, []);

  const selectedScan = scans.find((s) => s.id === selectedScanId) ?? null;

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
          <p className="font-display text-base text-ink">Chat Assistant</p>
          <span className="w-16" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 text-sage animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-card border border-clay-soft bg-clay-soft/40 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        ) : scans.length === 0 ? (
          <div className="rounded-card border border-line bg-white px-6 py-12 text-center">
            <p className="text-sm text-sage-muted">
              No scans yet. Upload one from the Dashboard to start a conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Scan picker */}
            <div className="relative mb-4">
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-card border border-line bg-white px-4 py-3 hover:bg-sage-soft/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {selectedScan && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toFileUrl(selectedScan.preview_url)}
                      alt="Chest X-ray thumbnail"
                      className="h-8 w-8 rounded-md object-cover bg-[#0f0f10]"
                    />
                  )}
                  <span className="text-sm text-ink">
                    Chatting about:{" "}
                    <span className="font-medium">
                      {selectedScan
                        ? new Date(selectedScan.uploaded_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>{" "}
                    scan
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-sage-muted" strokeWidth={1.75} />
              </button>

              {pickerOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-card border border-line bg-white shadow-lg max-h-64 overflow-y-auto">
                  {scans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => {
                        setSelectedScanId(scan.id);
                        setPickerOpen(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sage-soft/30 transition-colors",
                        scan.id === selectedScanId ? "bg-sage-soft/50" : "",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toFileUrl(scan.preview_url)}
                        alt="Chest X-ray thumbnail"
                        className="h-8 w-8 rounded-md object-cover bg-[#0f0f10]"
                      />
                      <div>
                        <p className="text-sm text-ink">
                          {new Date(scan.uploaded_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-sage-muted uppercase">{scan.modality.replace("_", " ")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedScanId && <ChatWindow key={selectedScanId} scanId={selectedScanId} />}
          </>
        )}
      </div>
    </AppShell>
  );
}
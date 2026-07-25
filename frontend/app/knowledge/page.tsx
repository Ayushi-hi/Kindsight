"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, BookOpen } from "lucide-react";
import { api, ApiError, type KnowledgeChunk } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listKnowledge()
      .then((res) => {
        if (cancelled) return;
        setChunks(res.chunks);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load the knowledge base.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header className="border-b border-line bg-white">
        <div className="px-8 py-5 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm text-sage-muted hover:text-ink transition-colors">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back
          </button>
          <p className="font-display text-base text-ink">Knowledge Base</p>
          <span className="text-sm text-sage-muted w-16 text-right">{total > 0 ? `${total} chunks` : ""}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <p className="text-sm text-sage-muted mb-6">
          Reference material Kindsight draws on when generating reports and answering questions. Curated, not a substitute for primary literature. Always correlate clinically.
        </p>

        {error && (
          <div className="rounded-card border border-clay-soft bg-clay-soft/40 px-4 py-3 text-sm text-clay mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 text-sage animate-spin" />
          </div>
        ) : chunks.length === 0 ? (
          <div className="rounded-card border border-line bg-white px-6 py-12 text-center">
            <BookOpen className="h-8 w-8 text-sage-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-sage-muted">The knowledge base hasn't been ingested yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chunks.map((chunk) => {
              const linkTag = chunk.url ? (
                <a href={chunk.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sage-muted hover:text-sage transition-colors" title="Open source">
                  <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                </a>
              ) : null;

              return (
                <div key={chunk.id} className="rounded-card border border-line bg-white p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-ink">{chunk.title || "Untitled reference"}</p>
                    {linkTag}
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed flex-1">{chunk.text}</p>
                  <span className="mt-3 text-xs font-medium text-sage-muted uppercase tracking-wide">{chunk.source}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
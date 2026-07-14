"use client";

import { useState } from "react";
import type { Finding } from "@/lib/api";

export function MultiHeatmapViewer({
  originalUrl,
  findings,
}: {
  originalUrl: string;
  findings: (Finding & { gradcam_full_url: string })[];
}) {
  const [activeCondition, setActiveCondition] = useState<string | null>(
    findings.length > 0 ? findings[0].condition : null
  );

  const activeFinding = findings.find((f) => f.condition === activeCondition);
  const activeUrl = activeFinding ? activeFinding.gradcam_full_url : originalUrl;

  return (
    <div className="rounded-card border border-line bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-wrap gap-2">
        <p className="text-sm font-medium text-ink">Chest X-ray</p>
        {findings.length > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-sage-soft p-1 text-xs flex-wrap">
            {findings.map((f) => (
              <button
                key={f.condition}
                onClick={() => setActiveCondition(f.condition)}
                className={[
                  "rounded-full px-3 py-1 transition-colors whitespace-nowrap",
                  activeCondition === f.condition ? "bg-sage text-white" : "text-sage-muted",
                ].join(" ")}
              >
                {f.condition.replace("_", " ")}
              </button>
            ))}
            <button
              onClick={() => setActiveCondition(null)}
              className={[
                "rounded-full px-3 py-1 transition-colors whitespace-nowrap",
                activeCondition === null ? "bg-sage text-white" : "text-sage-muted",
              ].join(" ")}
            >
              Original
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center bg-[#0f0f10] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeUrl}
          alt={activeFinding ? `Heatmap for ${activeFinding.condition}` : "Original chest X-ray"}
          className="max-h-[420px] w-auto rounded"
        />
      </div>
    </div>
  );
}

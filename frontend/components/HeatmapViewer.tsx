"use client";

import { useState } from "react";

export function HeatmapViewer({
  originalUrl,
  gradcamUrl,
}: {
  originalUrl: string;
  gradcamUrl: string | null;
}) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const activeUrl = showHeatmap && gradcamUrl ? gradcamUrl : originalUrl;

  return (
    <div className="rounded-card border border-line bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="text-sm font-medium text-ink">Chest X-ray</p>
        {gradcamUrl && (
          <div className="flex items-center gap-1 rounded-full bg-sage-soft p-1 text-xs">
            <button
              onClick={() => setShowHeatmap(true)}
              className={[
                "rounded-full px-3 py-1 transition-colors",
                showHeatmap ? "bg-sage text-white" : "text-sage-muted",
              ].join(" ")}
            >
              Heatmap
            </button>
            <button
              onClick={() => setShowHeatmap(false)}
              className={[
                "rounded-full px-3 py-1 transition-colors",
                !showHeatmap ? "bg-sage text-white" : "text-sage-muted",
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
          alt={showHeatmap ? "Chest X-ray with AI attention heatmap" : "Original chest X-ray"}
          className="max-h-[420px] w-auto rounded"
        />
      </div>
    </div>
  );
}

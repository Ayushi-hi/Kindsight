"use client";

import { useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const reset = () => setZoom(1);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-[#0f0f10] p-4 overflow-auto"
        style={{ maxHeight: 420 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[380px] w-auto rounded transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
      <div className="flex items-center justify-center gap-1 px-4 py-2.5 border-t border-line">
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="rounded p-1.5 text-sage-muted hover:bg-sage-soft hover:text-sage disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={reset}
          className="text-xs text-sage-muted w-12 text-center hover:text-sage transition-colors"
          aria-label="Reset zoom"
        >
          {(zoom * 100).toFixed(0)}%
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="rounded p-1.5 text-sage-muted hover:bg-sage-soft hover:text-sage disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className="w-px h-4 bg-line mx-1" />
        <button
          onClick={toggleFullscreen}
          className="rounded p-1.5 text-sage-muted hover:bg-sage-soft hover:text-sage transition-colors"
          aria-label="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function AttentionLegend() {
  return (
    <div className="flex flex-col items-center gap-1.5 pl-4">
      <span className="text-[11px] text-sage-muted text-center leading-tight">
        High
        <br />
        Attention
      </span>
      <div
        className="w-3 h-32 rounded-full"
        style={{
          background: "linear-gradient(to bottom, #DC2626, #F59E0B, #EAB308, #22C55E, #3B82F6)",
        }}
      />
      <span className="text-[11px] text-sage-muted text-center leading-tight">
        Low
        <br />
        Attention
      </span>
    </div>
  );
}

export function HeatmapViewer({
  originalUrl,
  gradcamUrl,
}: {
  originalUrl: string;
  gradcamUrl: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <p className="text-sm font-medium text-ink">Uploaded X-ray</p>
        </div>
        <ZoomableImage src={originalUrl} alt="Original chest X-ray" />
      </div>

      {gradcamUrl && (
        <div className="rounded-card border border-line bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-medium text-ink">Grad-CAM Visualization</p>
          </div>
          <div className="flex items-center justify-center gap-2 bg-[#0f0f10] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gradcamUrl}
              alt="Chest X-ray with AI attention heatmap"
              className="max-h-[380px] w-auto rounded"
            />
            <AttentionLegend />
          </div>
        </div>
      )}
    </div>
  );
}

export default HeatmapViewer;

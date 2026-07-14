import type { ReportOut } from "@/lib/api";

const severityLabel: Record<ReportOut["severity"], string> = {
  none: "No findings",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export function ReportCard({ report }: { report: ReportOut }) {
  const isNormal = report.severity === "none";

  return (
    <div
      className={[
        "rounded-card bg-white border border-line border-l-4 p-5",
        isNormal ? "border-l-sage" : "border-l-clay",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-lg text-ink">Report</p>
        <span
          className={[
            "text-xs font-medium px-2.5 py-1 rounded-full",
            isNormal ? "bg-sage-soft text-sage" : "bg-clay-soft text-clay",
          ].join(" ")}
        >
          {severityLabel[report.severity]}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-sage-muted uppercase tracking-wide mb-1">
            Findings
          </p>
          <p className="text-sm text-ink leading-relaxed">{report.findings}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-sage-muted uppercase tracking-wide mb-1">
            Impression
          </p>
          <p className="text-sm text-ink leading-relaxed">{report.impression}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-sage-muted uppercase tracking-wide mb-1">
            Recommendation
          </p>
          <p className="text-sm text-ink leading-relaxed">{report.recommendation}</p>
        </div>

        {report.citations.length > 0 && (
          <div className="pt-2 border-t border-line">
            <p className="text-xs font-medium text-sage-muted uppercase tracking-wide mb-2">
              Sources
            </p>
            <div className="flex flex-wrap gap-1.5">
              {report.citations.map((citation, i) => (
                <span
                  key={i}
                  className="text-xs bg-sage-soft text-sage px-2 py-0.5 rounded-full"
                >
                  {citation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-sage-muted mt-4 pt-4 border-t border-line">
        This is an AI-generated assistive read, not a final diagnosis. Always correlate with
        clinical judgment and a radiologist&apos;s review.
      </p>
    </div>
  );
}

import type { Finding } from "@/lib/api";

export function FindingsBadgeList({
  findings,
  activeCondition,
  onSelect,
}: {
  findings: Finding[];
  activeCondition: string | null;
  onSelect: (condition: string) => void;
}) {
  if (findings.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-sage-soft px-4 py-1.5 text-sm font-medium text-sage">
        <span className="h-2 w-2 rounded-full bg-sage" />
        No conditions flagged
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {findings.map((finding) => {
        const isActive = finding.condition === activeCondition;
        return (
          <button
            key={finding.condition}
            onClick={() => onSelect(finding.condition)}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-clay text-white" : "bg-clay-soft text-clay hover:bg-clay/20",
            ].join(" ")}
          >
            <span className={["h-2 w-2 rounded-full", isActive ? "bg-white" : "bg-clay"].join(" ")} />
            {finding.condition.replace("_", " ")}
            <span className="opacity-75">· {(finding.confidence * 100).toFixed(0)}%</span>
          </button>
        );
      })}
    </div>
  );
}

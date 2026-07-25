export function ProbabilityBar({
  label,
  percent,
  tone = "sage",
}: {
  label: string;
  percent: number;
  tone?: "sage" | "clay";
}) {
  const barColor = tone === "clay" ? "bg-clay" : "bg-sage";

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-ink">{label}</span>
        <span className="text-ink font-medium">{percent.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export default ProbabilityBar;

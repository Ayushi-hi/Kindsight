export function ConfidenceBadge({
  label,
  confidence,
}: {
  label: "pneumonia" | "normal";
  confidence: number;
}) {
  const isPneumonia = label === "pneumonia";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
        isPneumonia ? "bg-clay-soft text-clay" : "bg-sage-soft text-sage",
      ].join(" ")}
    >
      <span
        className={["h-2 w-2 rounded-full", isPneumonia ? "bg-clay" : "bg-sage"].join(" ")}
      />
      {isPneumonia ? "Pneumonia likely" : "No pneumonia detected"}
      <span className="text-xs opacity-70">· {(confidence * 100).toFixed(0)}% confidence</span>
    </span>
  );
}

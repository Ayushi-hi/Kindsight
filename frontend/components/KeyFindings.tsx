import { CheckCircle2, Info } from "lucide-react";

/** Splits report prose into short bullet-style sentences for the checklist UI.
 * Purely a display transform of text the backend already generated —
 * no new claims are introduced. */
function toBullets(text: string, max = 4): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, max);
}

export function KeyFindings({ findings, impression }: { findings: string; impression: string }) {
  const bullets = toBullets(`${findings} ${impression}`);

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <p className="font-display text-base text-ink mb-4">Key Findings</p>
      {bullets.length > 0 ? (
        <ul className="space-y-2.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink leading-snug">
              <CheckCircle2 className="h-4 w-4 text-sage shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-sage-muted">No findings summary available yet.</p>
      )}

      <div className="mt-4 rounded-lg bg-sage-soft px-3.5 py-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-sage shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-xs text-sage leading-relaxed">
          This is an AI-assisted analysis. Please correlate with clinical findings.
        </p>
      </div>
    </div>
  );
}

export default KeyFindings;

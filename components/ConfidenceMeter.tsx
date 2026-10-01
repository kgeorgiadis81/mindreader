import { cn } from "@/lib/utils";

type ConfidenceMeterProps = {
  value: number;
};

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Εμπιστοσύνη
        </span>
        <span className="font-mono text-sm text-cyan-300 tabular-nums">{clamped}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label="Εμπιστοσύνη στην ανάγνωση του μυαλού"
      >
        <div
          className={cn(
            "h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,225,255,0.55)] motion-safe:transition-[width] motion-safe:duration-500",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

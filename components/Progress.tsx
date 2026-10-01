import { cn } from "@/lib/utils";

type ProgressProps = {
  answered: number;
  total?: number;
};

export function Progress({ answered, total = 10 }: ProgressProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      aria-label={`${answered} από ${total} ερωτήσεις απαντήθηκαν`}
    >
      {Array.from({ length: total }, (_, index) => {
        const filled = index < answered;
        return (
          <span
            key={index}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              filled ? "bg-cyan-300 shadow-[0_0_8px_rgba(34,225,255,0.7)]" : "bg-white/15",
            )}
          />
        );
      })}
    </div>
  );
}

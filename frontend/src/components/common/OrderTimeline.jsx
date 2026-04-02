import { CheckCircle2, ChevronDown, ChevronUp, Circle, Clock3, Truck } from "lucide-react";
import { useMemo, useState } from "react";

export default function OrderTimeline({ steps = [], compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSteps = useMemo(() => {
    if (expanded || steps.length <= 3) {
      return steps;
    }

    const activeIndex = steps.findIndex((step) => step.active);
    const pivotIndex = activeIndex >= 0 ? activeIndex : steps.findLastIndex((step) => step.complete);

    if (pivotIndex <= 1) {
      return steps.slice(0, 3);
    }

    if (pivotIndex >= steps.length - 1) {
      return steps.slice(-3);
    }

    return steps.slice(pivotIndex - 1, pivotIndex + 2);
  }, [expanded, steps]);

  if (!steps.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {visibleSteps.map((step) => {
          const Icon = step.complete ? CheckCircle2 : step.active ? Truck : step.at ? Clock3 : Circle;

          return (
            <div
              key={step.key}
              className={`rounded-[24px] border px-4 py-4 ${
                step.complete
                  ? "border-emerald-400/20 bg-emerald-500/10"
                  : step.active
                    ? "border-cyan-400/20 bg-cyan-500/10"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={step.complete ? "text-emerald-300" : step.active ? "text-cyan-300" : "text-slate-500"} />
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{step.label}</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{step.headline}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</p>
              <p className="mt-3 text-xs text-slate-500">{step.at ? new Date(step.at).toLocaleString() : "Waiting for this stage"}</p>
            </div>
          );
        })}
      </div>
      {steps.length > 3 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}

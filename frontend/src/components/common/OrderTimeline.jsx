import { CheckCircle2, Circle, Clock3, Truck } from "lucide-react";

export default function OrderTimeline({ steps = [], compact = false }) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-6"}`}>
      {steps.map((step) => {
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
  );
}

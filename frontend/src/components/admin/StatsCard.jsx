import { animate } from "framer-motion";
import { useEffect, useState } from "react";
import TiltCard from "../common/TiltCard";

function formatAnimatedValue(rawValue, type) {
  if (type === "currency") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0
    }).format(rawValue || 0);
  }

  if (type === "percent") {
    return `${Number(rawValue || 0).toFixed(1)}%`;
  }

  return new Intl.NumberFormat("en-PH").format(Math.round(rawValue || 0));
}

export default function StatsCard({ label, value, helper, tone = "brand", className = "" }) {
  const [displayValue, setDisplayValue] = useState(value.numericValue ?? 0);

  useEffect(() => {
    const controls = animate(0, Number(value.numericValue || 0), {
      duration: 0.8,
      onUpdate(latest) {
        setDisplayValue(latest);
      }
    });

    return () => controls.stop();
  }, [value.numericValue]);

  const toneMap = {
    brand: "from-brand-500/20 via-brand-400/10 to-transparent",
    emerald: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    amber: "from-orange-500/20 via-amber-400/10 to-transparent",
    cyan: "from-cyan-500/20 via-cyan-400/10 to-transparent"
  };

  return (
    <TiltCard className={className}>
      <div className={`glass-panel relative overflow-hidden rounded-[28px] p-5 shadow-ambient transition duration-300 hover:-translate-y-1 hover:border-brand-500/20 hover:bg-white/[0.07]`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneMap[tone] || toneMap.brand}`} />
        <div className="relative">
          <p className="text-sm text-slate-400">{label}</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">{formatAnimatedValue(displayValue, value.type)}</h3>
          <p className="mt-3 text-sm text-slate-300">{helper}</p>
        </div>
      </div>
    </TiltCard>
  );
}

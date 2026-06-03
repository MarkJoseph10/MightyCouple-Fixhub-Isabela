import { useEffect, useState } from "react";

function getRemainingTime(endDate) {
  const target = new Date(endDate);
  const diff = target.getTime() - Date.now();

  if (!Number.isFinite(target.getTime()) || diff <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { days, hours, minutes };
}

export default function CountdownTimer({ endDate, title = "Offer ends in" }) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(endDate));

  useEffect(() => {
    setRemaining(getRemainingTime(endDate));

    const interval = setInterval(() => {
      setRemaining(getRemainingTime(endDate));
    }, 60000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!remaining) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-orange-400/20 bg-orange-500/10 p-4 text-orange-100">
      <p className="text-xs uppercase tracking-[0.3em] text-orange-200">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-slate-950/30 px-3 py-4">
          <p className="text-2xl font-semibold text-white">{remaining.days}</p>
          <p className="text-xs text-orange-100/80">Days</p>
        </div>
        <div className="rounded-2xl bg-slate-950/30 px-3 py-4">
          <p className="text-2xl font-semibold text-white">{remaining.hours}</p>
          <p className="text-xs text-orange-100/80">Hours</p>
        </div>
        <div className="rounded-2xl bg-slate-950/30 px-3 py-4">
          <p className="text-2xl font-semibold text-white">{remaining.minutes}</p>
          <p className="text-xs text-orange-100/80">Minutes</p>
        </div>
      </div>
    </div>
  );
}

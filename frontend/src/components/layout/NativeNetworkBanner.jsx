import { Capacitor } from "@capacitor/core";
import { AlertTriangle, RefreshCcw, Wifi, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNetworkStatus } from "../../context/NetworkContext";

export default function NativeNetworkBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const network = useNetworkStatus();

  const copy = useMemo(() => {
    if (!network) {
      return null;
    }

    if (!network.connected) {
      return {
        icon: WifiOff,
        tone: "border-rose-400/25 bg-rose-500/15 text-rose-50",
        title: "You're offline",
        description: "Some actions may fail until your connection comes back."
      };
    }

    if (network.isWeakConnection) {
      return {
        icon: AlertTriangle,
        tone: "border-amber-400/25 bg-amber-500/15 text-amber-50",
        title: "Weak connection detected",
        description: "Uploads, chat, and checkout steps may take longer than usual."
      };
    }

    return null;
  }, [network]);

  if (!Capacitor.isNativePlatform() || !copy) {
    return null;
  }

  const Icon = copy.icon;

  return (
    <div className={`mx-3 mt-3 flex items-start gap-3 rounded-[22px] border px-4 py-3 shadow-lg ${copy.tone}`}>
      <div className="mt-0.5 rounded-full border border-white/10 bg-slate-950/20 p-2">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="mt-1 text-xs leading-5 text-current/90">{copy.description}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true })}
        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/20 px-3 py-1.5 text-[11px] font-medium text-white/95 transition hover:bg-slate-950/35"
      >
        <RefreshCcw size={12} />
        Retry
      </button>
    </div>
  );
}

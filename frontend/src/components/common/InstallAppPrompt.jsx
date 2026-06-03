import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "shopverse-install-banner-dismissed";

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsStandalone(isStandaloneMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsDismissed(true);
      window.localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const steps = useMemo(
    () => [
      "Tap the Share button in your browser.",
      "Choose Add to Home Screen.",
      "Open Mighty Couple from your home screen for the app view."
    ],
    []
  );

  function dismissPrompt() {
    setIsDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismissPrompt();
      return;
    }

    if (isIos) {
      setShowSteps((current) => !current);
      return;
    }

    setShowSteps((current) => !current);
  }

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 md:hidden">
      <div className="glass-panel mx-auto max-w-md rounded-3xl border border-brand-400/30 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Install the Mighty Couple app</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {deferredPrompt
                ? "Add it to your home screen for faster access and a smoother app-like experience."
                : "Open it like an app from your phone. If your browser doesn’t show install, we’ll guide you."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            <Download size={16} />
            <span>{deferredPrompt ? "Install now" : isIos ? "Show install steps" : "Install app"}</span>
          </button>
          {isIos && !deferredPrompt && (
            <button
              type="button"
              onClick={() => setShowSteps((current) => !current)}
              className="rounded-2xl border border-white/10 px-3 py-3 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              How to
            </button>
          )}
        </div>

        {showSteps && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
            <p className="mb-2 font-semibold text-white">Install steps</p>
            <ol className="space-y-1.5">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

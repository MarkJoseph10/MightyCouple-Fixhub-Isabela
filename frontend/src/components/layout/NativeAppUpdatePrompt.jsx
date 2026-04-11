import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Download, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { resolveAndroidDownloadUrl } from "../../utils/androidDownload";

function compareVersions(left = "", right = "") {
  const leftParts = String(left).split(".").map((part) => Number(part || 0));
  const rightParts = String(right).split(".").map((part) => Number(part || 0));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

export default function NativeAppUpdatePrompt() {
  const { settings } = useStoreSettings();
  const [currentVersion, setCurrentVersion] = useState("");
  const [dismissedVersion, setDismissedVersion] = useState("");

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    CapacitorApp.getInfo()
      .then((info) => setCurrentVersion(String(info.version || "")))
      .catch(() => {});

    try {
      setDismissedVersion(window.localStorage.getItem("shopverse-dismissed-update-version") || "");
    } catch {
      // Ignore local storage failures.
    }

    return undefined;
  }, []);

  const config = settings?.mobileApp || {};
  const latestVersion = String(config.androidLatestVersion || "").trim();
  const minimumVersion = String(config.androidMinimumVersion || "").trim();
  const updateUrl = resolveAndroidDownloadUrl(settings);
  const updateMessage = String(config.androidUpdateMessage || "").trim();
  const forceUpdate = Boolean(minimumVersion && currentVersion && compareVersions(currentVersion, minimumVersion) < 0);
  const shouldRecommendUpdate = Boolean(
    latestVersion &&
    currentVersion &&
    compareVersions(currentVersion, latestVersion) < 0 &&
    dismissedVersion !== latestVersion
  );

  const shouldShow = Capacitor.isNativePlatform() && (forceUpdate || shouldRecommendUpdate);

  const title = useMemo(() => {
    if (forceUpdate) {
      return "Update required";
    }

    return "A newer app build is ready";
  }, [forceUpdate]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#091225] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-500/20 p-2 text-brand-100">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-400">Current version {currentVersion || "unknown"}</p>
            </div>
          </div>
          {!forceUpdate ? (
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.setItem("shopverse-dismissed-update-version", latestVersion);
                } catch {
                  // Ignore local storage failures.
                }
                setDismissedVersion(latestVersion);
              }}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
              title="Maybe later"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-slate-200">
            {updateMessage || "Install the latest Android build to keep login, uploads, and notifications working smoothly."}
          </p>
          {latestVersion ? (
            <p className="mt-3 text-xs text-slate-400">Latest Android version: {latestVersion}</p>
          ) : null}
          {minimumVersion ? (
            <p className="mt-1 text-xs text-slate-400">Minimum supported version: {minimumVersion}</p>
          ) : null}

          <div className="mt-5 flex gap-3">
            {!forceUpdate ? (
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.setItem("shopverse-dismissed-update-version", latestVersion);
                  } catch {
                    // Ignore local storage failures.
                  }
                  setDismissedVersion(latestVersion);
                }}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Later
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await Browser.open({ url: updateUrl });
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <Download size={15} />
              Update now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Bell, Download, PackageCheck, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { resolveMediaUrl } from "../../utils/media";
import { resolveAndroidDownloadUrl } from "../../utils/androidDownload";

const featureCards = [
  {
    icon: Smartphone,
    title: "Native Android experience",
    description: "Install the actual Mighty Couple app on your phone instead of using the browser storefront."
  },
  {
    icon: Bell,
    title: "Push-ready updates",
    description: "Get order updates, payment confirmations, and app releases through the native Android flow."
  },
  {
    icon: PackageCheck,
    title: "Checkout and tracking",
    description: "Keep login, cart, checkout, messaging, and order tracking inside the installed app."
  },
  {
    icon: ShieldCheck,
    title: "Safer support path",
    description: "Use one official download portal and one support contact so customers do not install the wrong file."
  }
];

const installSteps = [
  {
    title: "Download the APK",
    description: "Tap the download button on this page and wait for the Android package file to finish downloading."
  },
  {
    title: "Allow first-time install",
    description: "If Android prompts you, allow installs from your browser or file manager for this one source."
  },
  {
    title: "Open Mighty Couple",
    description: "Install the package, launch the app, and sign in to start shopping, tracking orders, and receiving updates."
  }
];

export default function AndroidDownloadPage() {
  const { settings } = useStoreSettings();
  const storeName = settings.storeName || "Mighty Couple";
  const mobileApp = settings.mobileApp || {};
  const downloadUrl = resolveAndroidDownloadUrl(settings);
  const heroImageUrl = resolveMediaUrl(settings.heroImage?.url || settings.banner?.url || settings.logo?.url || "");
  const latestVersion = String(mobileApp.androidLatestVersion || "").trim() || "1.0";
  const updateMessage = String(mobileApp.androidUpdateMessage || "").trim()
    || "Install the latest Android build to keep login, uploads, checkout, and notifications working smoothly.";
  const isAndroidDevice = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent || "");

  return (
    <div className="page-shell py-6 sm:py-8 lg:py-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="glass-panel overflow-hidden rounded-[34px] border border-white/10 p-5 shadow-ambient sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Native Android app
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
              Version {latestVersion}
            </span>
          </div>

          <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Install {storeName} on Android from the official website.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            This site is now the official download portal for the native app. Customers install the Android package here,
            then use the real app for login, checkout, tracking, chat, and notifications.
          </p>
          <p className="mt-4 max-w-2xl rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200">
            {updateMessage}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              <Download size={17} />
              {isAndroidDevice ? "Download Android APK" : "Get the Android app"}
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Contact support
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Install file</p>
              <p className="mt-2 text-lg font-semibold text-white">Signed APK</p>
              <p className="mt-2 text-sm text-slate-300">Direct install without the Play Store.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Platform</p>
              <p className="mt-2 text-lg font-semibold text-white">Android</p>
              <p className="mt-2 text-sm text-slate-300">Best downloaded from Chrome or another Android browser.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Support</p>
              <p className="mt-2 text-lg font-semibold text-white">Manual updates</p>
              <p className="mt-2 text-sm text-slate-300">Future builds can be downloaded from the same portal link.</p>
            </div>
          </div>
        </div>

        <aside className="overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/40 shadow-ambient">
          <div className="relative min-h-[320px] overflow-hidden">
            {heroImageUrl ? (
              <img src={heroImageUrl} alt={`${storeName} Android app preview`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_34%),linear-gradient(180deg,#081120_0%,#111827_100%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/40 to-slate-950/90" />
            <div className="relative z-10 flex h-full flex-col justify-end p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/80">Official install notes</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Customers should install only from this portal.</h3>
              <div className="mt-4 rounded-[24px] border border-amber-300/15 bg-amber-400/10 p-4 text-sm text-amber-50">
                <div className="flex items-start gap-3">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <p>
                    If Android shows a warning for first-time installs, allow the browser or file manager as an install source,
                    then continue with the APK setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-ambient backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[34px] border border-white/10 bg-white/5 p-5 shadow-ambient sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Install guide</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">Three quick steps for customers</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-300">
            Keep this page public so buyers can always return here for the newest Android build and support links.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {installSteps.map((step, index) => (
            <div key={step.title} className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/80">Step {index + 1}</p>
              <h4 className="mt-3 text-xl font-semibold text-white">{step.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

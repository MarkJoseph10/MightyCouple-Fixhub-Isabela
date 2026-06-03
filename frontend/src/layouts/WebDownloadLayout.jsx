import { Download, ExternalLink, LogIn } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { resolveMediaUrl } from "../utils/media";
import { resolveAndroidDownloadUrl } from "../utils/androidDownload";

const portalLinks = [
  { to: "/", label: "Download" },
  { to: "/auth", label: "Login" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/shipping-policy", label: "Shipping" },
  { to: "/return-policy", label: "Returns" },
  { to: "/contact", label: "Support" }
];

function PortalLink({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function WebDownloadLayout() {
  const { settings } = useStoreSettings();
  const downloadUrl = resolveAndroidDownloadUrl(settings);
  const logoUrl = resolveMediaUrl(settings.logo?.url || "");
  const storeName = settings.storeName || "Mighty Couple";

  return (
    <div className="min-h-screen">
      <header className="page-shell pt-4 sm:pt-6">
        <div className="glass-panel rounded-[28px] border border-white/10 px-4 py-4 shadow-ambient sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                {logoUrl ? (
                  <img src={logoUrl} alt={`${storeName} logo`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold tracking-[0.24em] text-white">MC</span>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Android app</p>
                <h1 className="text-lg font-semibold text-white sm:text-xl">{storeName} download portal</h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end">
              <nav className="flex flex-wrap gap-2">
                {portalLinks.map((item) => (
                  <PortalLink key={item.to} to={item.to} label={item.label} />
                ))}
              </nav>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                <Download size={16} />
                Download APK
              </a>
              <NavLink
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <LogIn size={16} />
                Login / Sign up
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-10 sm:pb-14">
        <Outlet />
      </main>

      <footer className="page-shell pb-8 sm:pb-10">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/45 px-5 py-5 text-sm text-slate-300 shadow-ambient backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Need help?</p>
              <p className="mt-2 max-w-2xl">
                Download the Android app from this portal, then install it on your phone. If Android blocks the first install,
                allow installs from your browser or file manager and try again.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:supportmightycouple@gmail.com"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-100 transition hover:bg-white/10"
              >
                <ExternalLink size={15} />
                supportmightycouple@gmail.com
              </a>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-cyan-100 transition hover:bg-cyan-400/15"
              >
                <Download size={15} />
                Latest APK
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

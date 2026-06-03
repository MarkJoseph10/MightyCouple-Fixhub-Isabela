import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext";

export default function Footer() {
  const { settings } = useStoreSettings();
  const socialLinks = [
    { label: "Facebook", href: settings.socialLinks?.facebook, icon: Facebook },
    { label: "Instagram", href: settings.socialLinks?.instagram, icon: Instagram },
    { label: "Twitter", href: settings.socialLinks?.twitter, icon: Twitter },
    { label: "LinkedIn", href: settings.socialLinks?.linkedin, icon: Linkedin }
  ].filter((item) => item.href);

  return (
    <footer className="border-t border-white/10 py-8">
      <div className="page-shell space-y-6 text-sm text-slate-400">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">About</p>
            <p>
              {settings.storeName} offers affordable gadgets with secure account-based checkout, shipping transparency, and trackable orders.
            </p>
            <p>
              Support:{" "}
              <a href="mailto:supportmightycouple@gmail.com" className="text-slate-200 transition hover:text-white">
                supportmightycouple@gmail.com
              </a>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Quick links</p>
            <div className="flex flex-col gap-2">
              <Link to="/contact" className="transition hover:text-white">Contact</Link>
              <Link to="/shipping-policy" className="transition hover:text-white">Shipping Policy</Link>
              <Link to="/return-policy" className="transition hover:text-white">Return Policy</Link>
              <Link to="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="transition hover:text-white">Terms</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Follow us</p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-slate-200 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/30 text-slate-200">
                    <Icon size={15} />
                  </span>
                  <span className="font-medium">{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Store info</p>
            <div className="flex flex-col gap-2">
              <p>Secure checkout and installment tracking</p>
              <p>Seller tools, refunds, and order history</p>
              <p>Responsive mobile app-style browsing</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs sm:text-sm">
          <span className="text-slate-500">© {new Date().getFullYear()} {settings.storeName}</span>
          <span className="text-slate-500">All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

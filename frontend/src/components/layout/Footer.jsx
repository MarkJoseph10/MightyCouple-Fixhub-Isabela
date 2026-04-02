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
      <div className="page-shell flex flex-col gap-6 text-sm text-slate-400">
        <div>
          <p>{settings.storeName} offers affordable gadgets with secure account-based checkout, shipping transparency, and trackable orders.</p>
          <p className="mt-2">Support: <a href="mailto:supportmightycouple@gmail.com" className="text-slate-200 hover:text-white">supportmightycouple@gmail.com</a></p>
        </div>
        <div className="w-full">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Follow us</p>
          <div className="mt-3 flex flex-row flex-nowrap items-center gap-3 overflow-x-auto pb-1 md:justify-start lg:justify-between">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 min-w-[150px] flex-none items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-slate-200 transition duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/30 text-slate-200">
                  <Icon size={15} />
                </span>
                <span className="font-medium">{label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4">
          <Link to="/contact" className="hover:text-white">Contact</Link>
          <Link to="/shipping-policy" className="hover:text-white">Shipping Policy</Link>
          <Link to="/return-policy" className="hover:text-white">Return Policy</Link>
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

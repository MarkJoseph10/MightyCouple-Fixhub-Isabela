import { Link } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext";

export default function Footer() {
  const { settings } = useStoreSettings();

  return (
    <footer className="border-t border-white/10 py-8">
      <div className="page-shell grid gap-6 text-sm text-slate-400 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p>{settings.storeName} offers affordable gadgets with secure account-based checkout, shipping transparency, and trackable orders.</p>
          <p className="mt-2">Support: <a href="mailto:support@mightycouple.com" className="text-slate-200 hover:text-white">support@mightycouple.com</a></p>
        </div>
        <div className="flex flex-wrap gap-4">
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

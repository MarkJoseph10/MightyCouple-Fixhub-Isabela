import { Link } from "react-router-dom";

export default function AccessPromptModal({
  open,
  title = "Please log in to continue",
  message,
  returnTo = "/",
  onClose
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-[32px] p-6 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Restricted action</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/auth"
            state={{ from: returnTo, message }}
            className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-brand-600"
          >
            Log in or register
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 transition duration-300 hover:bg-white/5"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

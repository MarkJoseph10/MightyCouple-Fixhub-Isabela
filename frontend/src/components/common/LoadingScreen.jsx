export default function LoadingScreen({ label = "Loading..." }) {
  return (
    <div className="page-shell flex min-h-[40vh] items-center justify-center">
      <div className="glass-panel rounded-3xl px-6 py-5 text-sm text-slate-300 shadow-ambient">
        {label}
      </div>
    </div>
  );
}


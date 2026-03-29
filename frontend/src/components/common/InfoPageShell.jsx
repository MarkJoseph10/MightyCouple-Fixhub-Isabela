export default function InfoPageShell({ eyebrow, title, description, children }) {
  return (
    <div className="page-shell py-10">
      <div className="glass-panel rounded-[36px] p-8 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-slate-300">{description}</p>}
        <div className="mt-8 space-y-6">{children}</div>
      </div>
    </div>
  );
}

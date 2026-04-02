import { useEffect } from "react";

export default function InfoPageShell({ eyebrow, title, description, children }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Mighty Couple`;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.appendChild(descriptionMeta);
    }

    if (description) {
      descriptionMeta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [description, title]);

  return (
    <div className="page-shell py-6 sm:py-8 lg:py-10">
      <div className="glass-panel rounded-[28px] p-5 shadow-ambient sm:rounded-[36px] sm:p-6 lg:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-slate-300">{description}</p>}
        <div className="mt-6 space-y-6 sm:mt-8">{children}</div>
      </div>
    </div>
  );
}

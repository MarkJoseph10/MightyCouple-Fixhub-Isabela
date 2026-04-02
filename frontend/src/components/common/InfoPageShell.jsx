import { useEffect } from "react";

export default function InfoPageShell({ eyebrow, title, description, children }) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMetaElement = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMetaElement?.getAttribute("content");
    const createdDescriptionMeta = !descriptionMetaElement;
    const activeDescriptionMeta = descriptionMetaElement || document.createElement("meta");

    document.title = `${title} | Mighty Couple`;

    if (createdDescriptionMeta) {
      activeDescriptionMeta.setAttribute("name", "description");
      document.head.appendChild(activeDescriptionMeta);
    }

    if (description) {
      activeDescriptionMeta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) {
        activeDescriptionMeta.setAttribute("content", previousDescription);
      } else if (createdDescriptionMeta) {
        activeDescriptionMeta.remove();
      }
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

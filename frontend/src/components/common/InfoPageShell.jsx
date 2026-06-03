import { useEffect } from "react";
import { getSiteUrl } from "../../utils/site";

export default function InfoPageShell({ eyebrow, title, description, children }) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMetaElement = document.querySelector('meta[name="description"]');
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    const ogUrlElement = document.querySelector('meta[property="og:url"]');
    const previousDescription = descriptionMetaElement?.getAttribute("content");
    const previousCanonical = canonicalElement?.getAttribute("href");
    const previousOgUrl = ogUrlElement?.getAttribute("content");
    const createdDescriptionMeta = !descriptionMetaElement;
    const createdCanonicalElement = !canonicalElement;
    const createdOgUrlElement = !ogUrlElement;
    const activeDescriptionMeta = descriptionMetaElement || document.createElement("meta");
    const activeCanonicalElement = canonicalElement || document.createElement("link");
    const activeOgUrlElement = ogUrlElement || document.createElement("meta");
    const canonicalUrl = getSiteUrl(window.location.pathname + window.location.search);

    document.title = `${title} | Mighty Couple`;

    if (createdDescriptionMeta) {
      activeDescriptionMeta.setAttribute("name", "description");
      document.head.appendChild(activeDescriptionMeta);
    }

    if (description) {
      activeDescriptionMeta.setAttribute("content", description);
    }

    if (createdCanonicalElement) {
      activeCanonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(activeCanonicalElement);
    }
    activeCanonicalElement.setAttribute("href", canonicalUrl);

    if (createdOgUrlElement) {
      activeOgUrlElement.setAttribute("property", "og:url");
      document.head.appendChild(activeOgUrlElement);
    }
    activeOgUrlElement.setAttribute("content", canonicalUrl);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) {
        activeDescriptionMeta.setAttribute("content", previousDescription);
      } else if (createdDescriptionMeta) {
        activeDescriptionMeta.remove();
      }

      if (previousCanonical !== null && previousCanonical !== undefined) {
        activeCanonicalElement.setAttribute("href", previousCanonical);
      } else if (createdCanonicalElement) {
        activeCanonicalElement.remove();
      }

      if (previousOgUrl !== null && previousOgUrl !== undefined) {
        activeOgUrlElement.setAttribute("content", previousOgUrl);
      } else if (createdOgUrlElement) {
        activeOgUrlElement.remove();
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

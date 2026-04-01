import { useStoreSettings } from "../../context/StoreSettingsContext";
import { resolveMediaUrl } from "../../utils/media";

function clampOverlay(value) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return 0.5;
  }

  return Math.min(0.6, Math.max(0.4, numericValue));
}

export default function BrandingBackground() {
  const { settings } = useStoreSettings();
  const backgroundImageUrl = resolveMediaUrl(settings.backgroundImage?.url || "/branding/default-background.jpg");
  const overlayOpacity = clampOverlay(settings.backgroundOverlay);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url("${backgroundImageUrl}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(2, 6, 23, ${Math.min(0.72, overlayOpacity + 0.1)}) 0%, rgba(2, 6, 23, ${overlayOpacity}) 42%, rgba(15, 23, 42, ${Math.min(0.78, overlayOpacity + 0.16)}) 100%)`
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(59,130,246,0.16),_transparent_24%)]" />
    </div>
  );
}

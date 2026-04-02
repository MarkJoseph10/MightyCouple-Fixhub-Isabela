const configuredSiteUrl =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "";

export function getSiteOrigin() {
  const value = String(configuredSiteUrl || "").trim();
  if (value) {
    return value.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

export function getSiteUrl(pathname = "/") {
  const origin = getSiteOrigin();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!origin) {
    return normalizedPath;
  }

  return new URL(normalizedPath, `${origin}/`).toString();
}

const mediaBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

export function resolveMediaUrl(url = "") {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  const localhostUploadMatch = value.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);

  if (localhostUploadMatch) {
    return `${mediaBaseUrl}${localhostUploadMatch[1]}`;
  }

  if (value.startsWith("/uploads/")) {
    return `${mediaBaseUrl}${value}`;
  }

  return value;
}

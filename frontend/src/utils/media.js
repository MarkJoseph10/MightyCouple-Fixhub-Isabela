const mediaBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

function buildCloudinaryTransformString(options = {}) {
  const transforms = ["f_auto", "q_auto", "dpr_auto", "fl_progressive"];

  if (options.width) {
    transforms.push(`w_${Math.round(options.width)}`);
  }

  if (options.height) {
    transforms.push(`h_${Math.round(options.height)}`);
  }

  if (options.fit) {
    transforms.push(`c_${options.fit}`);
  }

  return transforms.join(",");
}

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

export function optimizeImageUrl(url = "", options = {}) {
  const resolvedUrl = resolveMediaUrl(url);

  if (!resolvedUrl) {
    return "";
  }

  if (!resolvedUrl.includes("res.cloudinary.com/")) {
    return resolvedUrl;
  }

  if (resolvedUrl.includes("/upload/f_auto") || resolvedUrl.includes("/upload/q_auto")) {
    return resolvedUrl;
  }

  const transformString = buildCloudinaryTransformString(options);
  return resolvedUrl.replace("/upload/", `/upload/${transformString}/`);
}

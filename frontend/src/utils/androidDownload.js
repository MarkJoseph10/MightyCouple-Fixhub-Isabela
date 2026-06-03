import { resolveApiOrigin } from "../api/baseUrl";

export const DEFAULT_ANDROID_DOWNLOAD_FILENAME = "mightycouple-release.apk";

export function resolveAndroidDownloadUrl(settings) {
  const configuredUrl = String(settings?.mobileApp?.androidUpdateUrl || "").trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return `${resolveApiOrigin()}/downloads/${DEFAULT_ANDROID_DOWNLOAD_FILENAME}`;
}

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

function createFileName(prefix = "upload", mimeType = "image/jpeg") {
  const extension = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";

  return `${prefix}-${Date.now()}.${extension}`;
}

async function blobToFile(blob, fileName) {
  return new File([blob], fileName, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now()
  });
}

async function photoToFile(photo, prefix) {
  const response = await fetch(photo.webPath || photo.path);
  const blob = await response.blob();
  const fileName = createFileName(prefix, blob.type || photo.format || "image/jpeg");
  return blobToFile(blob, fileName);
}

export function isNativeMediaAvailable() {
  return Capacitor.isNativePlatform();
}

export async function captureImageFile(prefix = "camera") {
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera
  });

  return photoToFile(photo, prefix);
}

export async function pickImageFile(prefix = "gallery") {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos
  });

  return photoToFile(photo, prefix);
}

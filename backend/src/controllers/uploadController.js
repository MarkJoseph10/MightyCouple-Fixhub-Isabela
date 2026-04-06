import { Readable } from "stream";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

function buildUploadResponse(file, type, cloudinaryResult = null) {
  return {
    message: `${type === "video" ? "Video" : "Image"} uploaded successfully`,
    type,
    url: cloudinaryResult?.secure_url || "",
    mimeType: file.mimetype,
    sizeBytes: file.size,
    publicId: cloudinaryResult?.public_id || "",
    width: cloudinaryResult?.width || null,
    height: cloudinaryResult?.height || null,
    durationSeconds: cloudinaryResult?.duration || 0
  };
}

export function uploadBufferToCloudinary(file, type, options = {}) {
  const resourceType = options.resourceType || (type === "video" ? "video" : "image");
  const folder = options.folder || (type === "video" ? "shopverse/videos" : "shopverse/images");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
}

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image uploaded" });
    return;
  }

  if (!isCloudinaryConfigured) {
    throw new ApiError(500, "Cloudinary is not configured on the server");
  }

  const result = await uploadBufferToCloudinary(req.file, "image");

  res.status(201).json({
    ...buildUploadResponse(req.file, "image", result),
    imageUrl: result.secure_url
  });
});

export const uploadVideoFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No video uploaded" });
    return;
  }

  if (!isCloudinaryConfigured) {
    throw new ApiError(500, "Cloudinary is not configured on the server");
  }

  const result = await uploadBufferToCloudinary(req.file, "video");
  res.status(201).json(buildUploadResponse(req.file, "video", result));
});

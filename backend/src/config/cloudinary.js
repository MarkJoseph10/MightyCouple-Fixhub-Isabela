import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const isCloudinaryConfigured = Boolean(
  env.cloudinaryUrl ||
    (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret)
);

if (isCloudinaryConfigured) {
  cloudinary.config(
    env.cloudinaryUrl
      ? { secure: true, url: env.cloudinaryUrl }
      : {
          cloud_name: env.cloudinaryCloudName,
          api_key: env.cloudinaryApiKey,
          api_secret: env.cloudinaryApiSecret,
          secure: true
        }
  );
}

export { cloudinary, isCloudinaryConfigured };

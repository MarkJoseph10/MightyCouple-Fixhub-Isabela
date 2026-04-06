import dotenv from "dotenv";

dotenv.config();

const defaultClientUrl = "http://localhost:5173";
const clientUrls = (process.env.CLIENT_URL || defaultClientUrl)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  monitorErrors: process.env.MONITOR_ERRORS
    ? process.env.MONITOR_ERRORS !== "false"
    : process.env.NODE_ENV === "production",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopverse",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  clientUrl: clientUrls[0] || defaultClientUrl,
  clientUrls,
  adminName: process.env.ADMIN_NAME || "",
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryUrl: process.env.CLOUDINARY_URL || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  facebookAppId: process.env.FACEBOOK_APP_ID || "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  alertFromEmail: process.env.ALERT_FROM_EMAIL || "",
  alertReplyToEmail: process.env.ALERT_REPLY_TO_EMAIL || "",
  cjApiKey: process.env.CJ_API_KEY || "",
  cjPhpExchangeRate: Number(process.env.CJ_PHP_EXCHANGE_RATE || 58),
  cjMarkupPercent: Number(process.env.CJ_MARKUP_PERCENT || 15),
  aliExpressAppKey: process.env.ALIEXPRESS_APP_KEY || "",
  spocketApiKey: process.env.SPOCKET_API_KEY || ""
};

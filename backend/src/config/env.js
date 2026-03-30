import dotenv from "dotenv";

dotenv.config();

const defaultClientUrl = "http://localhost:5173";
const clientUrls = (process.env.CLIENT_URL || defaultClientUrl)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopverse",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  clientUrl: clientUrls[0] || defaultClientUrl,
  clientUrls,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  cjApiKey: process.env.CJ_API_KEY || "",
  aliExpressAppKey: process.env.ALIEXPRESS_APP_KEY || "",
  spocketApiKey: process.env.SPOCKET_API_KEY || ""
};

import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopverse",
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  cjApiKey: process.env.CJ_API_KEY || "",
  aliExpressAppKey: process.env.ALIEXPRESS_APP_KEY || "",
  spocketApiKey: process.env.SPOCKET_API_KEY || ""
};


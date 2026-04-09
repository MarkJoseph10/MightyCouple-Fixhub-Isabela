import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { isRuntimeReady } from "./services/runtimeState.js";
import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import repairRoutes from "./routes/repairRoutes.js";
import realtimeRoutes from "./routes/realtimeRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import storeSettingsRoutes from "./routes/storeSettingsRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(env.clientUrls);
  const isSafeLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const isSafeNativeOrigin = (origin) => origin === "capacitor://localhost" || origin === "ionic://localhost";
  const isAllowedOrigin = (origin) =>
    !origin || allowedOrigins.has(origin) || isSafeLocalOrigin(origin) || isSafeNativeOrigin(origin);

  app.disable("x-powered-by");
  app.use((_, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (!isAllowedOrigin(origin)) {
      if (req.method === "OPTIONS") {
        res.status(403).json({ message: "Origin not allowed by CORS" });
        return;
      }

      next(new Error("Origin not allowed by CORS"));
      return;
    }

    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  app.get("/api/health", (_, res) => {
    res.json({ status: isRuntimeReady() ? "ok" : "booting" });
  });

  app.use("/api", (req, res, next) => {
    if (req.path === "/health") {
      next();
      return;
    }

    if (!isRuntimeReady()) {
      res.status(503).json({
        message: "Server is starting up. Please try again in a few moments."
      });
      return;
    }

    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/newsletter", newsletterRoutes);
  app.use("/api/activity-logs", activityLogRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/repairs", repairRoutes);
  app.use("/api/realtime", realtimeRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/settings", storeSettingsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/suppliers", supplierRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

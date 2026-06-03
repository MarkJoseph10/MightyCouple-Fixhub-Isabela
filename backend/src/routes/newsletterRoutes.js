import { Router } from "express";
import { subscribeToNewsletter } from "../controllers/newsletterController.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = Router();
const newsletterRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 3,
  message: "Too many newsletter signup attempts. Please try again later."
});

router.post("/", newsletterRateLimit, subscribeToNewsletter);

export default router;

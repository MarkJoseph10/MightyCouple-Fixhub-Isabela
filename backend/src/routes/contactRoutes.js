import { Router } from "express";
import { getContactMessages, submitContactMessage } from "../controllers/contactController.js";
import { authorize, protect } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = Router();
const contactRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 3,
  message: "Too many contact form submissions. Please try again later."
});

router.post("/", contactRateLimit, submitContactMessage);
router.get("/", protect, authorize("admin"), getContactMessages);

export default router;

import { Router } from "express";
import {
  loginWithFacebook,
  getCurrentUser,
  loginWithGoogle,
  loginUser,
  registerUser,
  updateAdminCredentials
} from "../controllers/authController.js";
import { authorize, protect } from "../middleware/auth.js";
import { createRateLimiter, loginRateLimit } from "../middleware/rateLimit.js";

const router = Router();
const authBurstLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  message: "Too many authentication attempts. Please try again in a few minutes."
});

router.post("/register", authBurstLimit, registerUser);
router.post("/login", loginRateLimit, loginUser);
router.post("/google", authBurstLimit, loginWithGoogle);
router.post("/facebook", authBurstLimit, loginWithFacebook);
router.get("/me", protect, getCurrentUser);
router.put("/admin-profile", protect, authorize("admin"), updateAdminCredentials);

export default router;

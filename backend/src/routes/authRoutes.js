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
import { loginRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginRateLimit, loginUser);
router.post("/google", loginWithGoogle);
router.post("/facebook", loginWithFacebook);
router.get("/me", protect, getCurrentUser);
router.put("/admin-profile", protect, authorize("admin"), updateAdminCredentials);

export default router;

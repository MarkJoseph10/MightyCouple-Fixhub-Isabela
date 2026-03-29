import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateAdminCredentials
} from "../controllers/authController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);
router.put("/admin-profile", protect, authorize("admin"), updateAdminCredentials);

export default router;


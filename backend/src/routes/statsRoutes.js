import { Router } from "express";
import { getDashboardStats } from "../controllers/statsController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getDashboardStats);

export default router;


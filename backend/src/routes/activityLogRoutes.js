import { Router } from "express";
import { exportActivityLogs, getActivityLogs } from "../controllers/activityLogController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getActivityLogs);
router.get("/export", protect, authorize("admin"), exportActivityLogs);

export default router;

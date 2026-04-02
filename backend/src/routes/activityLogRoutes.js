import { Router } from "express";
import { getActivityLogs } from "../controllers/activityLogController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getActivityLogs);

export default router;

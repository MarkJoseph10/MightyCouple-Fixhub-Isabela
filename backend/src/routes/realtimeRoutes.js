import { Router } from "express";
import { openRealtimeStream } from "../controllers/realtimeController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/stream", protect, openRealtimeStream);

export default router;


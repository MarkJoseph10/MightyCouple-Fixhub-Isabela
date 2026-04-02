import { Router } from "express";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);

export default router;

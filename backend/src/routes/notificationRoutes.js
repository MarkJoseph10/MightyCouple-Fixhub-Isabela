import { Router } from "express";
import {
  getMyNotifications,
  registerDeviceToken,
  markAllNotificationsRead,
  markNotificationRead,
  unregisterDeviceToken
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getMyNotifications);
router.post("/device", protect, registerDeviceToken);
router.delete("/device", protect, unregisterDeviceToken);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);

export default router;

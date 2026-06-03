import { Router } from "express";
import {
  getAdminStoreSettings,
  getPublicStoreSettings,
  updateStoreSettings
} from "../controllers/storeSettingsController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/public", getPublicStoreSettings);
router.get("/", protect, authorize("admin"), getAdminStoreSettings);
router.put("/", protect, authorize("admin"), updateStoreSettings);

export default router;

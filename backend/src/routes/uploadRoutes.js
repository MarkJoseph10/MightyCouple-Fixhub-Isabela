import { Router } from "express";
import { upload, uploadVideo } from "../config/multer.js";
import { uploadImage, uploadVideoFile } from "../controllers/uploadController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/", protect, authorize("admin", "seller"), upload.single("image"), uploadImage);
router.post("/video", protect, authorize("admin", "seller"), uploadVideo.single("video"), uploadVideoFile);

export default router;

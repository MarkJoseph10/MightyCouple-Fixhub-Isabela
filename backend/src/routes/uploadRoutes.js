import { Router } from "express";
import { upload } from "../config/multer.js";
import { uploadImage } from "../controllers/uploadController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/", protect, authorize("admin"), upload.single("image"), uploadImage);

export default router;


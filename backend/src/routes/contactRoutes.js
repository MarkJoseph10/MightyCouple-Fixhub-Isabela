import { Router } from "express";
import { getContactMessages, submitContactMessage } from "../controllers/contactController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/", submitContactMessage);
router.get("/", protect, authorize("admin"), getContactMessages);

export default router;

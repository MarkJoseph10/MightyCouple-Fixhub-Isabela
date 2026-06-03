import { Router } from "express";
import { initializePayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/intent", protect, initializePayment);

export default router;

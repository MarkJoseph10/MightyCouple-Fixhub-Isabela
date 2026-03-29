import { Router } from "express";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  trackOrder,
  uploadPaymentProof,
  updateOrderStatus
} from "../controllers/orderController.js";
import { authorize, optionalAuth, protect } from "../middleware/auth.js";
import { upload } from "../config/multer.js";

const router = Router();

router.post("/", protect, createOrder);
router.get("/track/:id", optionalAuth, trackOrder);
router.post("/:id/payment-proof", optionalAuth, upload.single("image"), uploadPaymentProof);
router.get("/mine", protect, getMyOrders);
router.get("/", protect, authorize("admin"), getAllOrders);
router.get("/:id", protect, getOrderById);
router.patch("/:id/status", protect, authorize("admin"), updateOrderStatus);

export default router;

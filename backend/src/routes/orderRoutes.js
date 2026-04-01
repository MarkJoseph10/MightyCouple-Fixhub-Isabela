import { Router } from "express";
import {
  createOrder,
  getAllInstallments,
  getAllOrders,
  getMyInstallments,
  getMyOrders,
  getOrderByReference,
  getOrderById,
  getSellerOrders,
  reviewInstallmentPayment,
  requestRefund,
  submitInstallmentPayment,
  trackOrder,
  uploadPaymentProof,
  updateInstallmentStatus,
  updateRefundStatus,
  updateOrderStatus
} from "../controllers/orderController.js";
import { authorize, optionalAuth, protect } from "../middleware/auth.js";
import { upload } from "../config/multer.js";

const router = Router();

router.post("/", protect, createOrder);
router.get("/track/:id", optionalAuth, trackOrder);
router.post("/:id/payment-proof", optionalAuth, upload.single("image"), uploadPaymentProof);
router.post("/:id/installment-payments", protect, upload.single("image"), submitInstallmentPayment);
router.post("/:id/refund-request", protect, upload.single("image"), requestRefund);
router.get("/installments/mine", protect, getMyInstallments);
router.get("/seller/mine", protect, authorize("seller"), getSellerOrders);
router.get("/mine", protect, getMyOrders);
router.get("/installments", protect, authorize("admin"), getAllInstallments);
router.get("/", protect, authorize("admin"), getAllOrders);
router.get("/reference/:reference", protect, getOrderByReference);
router.get("/:id", protect, getOrderById);
router.patch("/:id/installment-payments/:paymentId", protect, authorize("admin"), reviewInstallmentPayment);
router.patch("/:id/installment", protect, authorize("admin"), updateInstallmentStatus);
router.patch("/:id/status", protect, authorize("admin"), updateOrderStatus);
router.patch("/:id/refund", protect, authorize("admin"), updateRefundStatus);

export default router;

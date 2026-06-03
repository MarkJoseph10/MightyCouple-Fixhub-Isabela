import { Router } from "express";
import { uploadChatMedia } from "../config/multer.js";
import {
  addRepairAvailableSlot,
  assignRepairRequest,
  claimRepairRequest,
  createRepairRequest,
  finalizeRepairRequest,
  getAllRepairRequests,
  getMyRepairRequests,
  getRepairBookingOptions,
  getRepairRequestById,
  getSellerRepairRequests,
  respondRepairQuote,
  submitRepairQuote,
  submitRepairRating,
  updateRepairDispute,
  updateRepairSchedule,
  updateRepairServicePoints,
  updateRepairSlot,
  updateRepairStatus,
  uploadRepairAttachments,
  bookRepairSlot
} from "../controllers/repairController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/options", protect, getRepairBookingOptions);
router.get("/mine", protect, getMyRepairRequests);
router.get("/seller/mine", protect, getSellerRepairRequests);
router.get("/", protect, getAllRepairRequests);
router.patch("/service-points/:sellerId?", protect, updateRepairServicePoints);
router.post("/", protect, uploadChatMedia.array("attachments", 4), createRepairRequest);
router.get("/:id", protect, getRepairRequestById);
router.patch("/:id/assign", protect, assignRepairRequest);
router.patch("/:id/status", protect, updateRepairStatus);
router.patch("/:id/quote", protect, submitRepairQuote);
router.patch("/:id/quote/respond", protect, respondRepairQuote);
router.post("/:id/slots", protect, addRepairAvailableSlot);
router.patch("/:id/slots/:slotId", protect, updateRepairSlot);
router.patch("/:id/slots/:slotId/book", protect, bookRepairSlot);
router.patch("/:id/schedule", protect, updateRepairSchedule);
router.post("/:id/attachments/:category", protect, uploadChatMedia.array("attachments", 8), uploadRepairAttachments);
router.patch("/:id/finalize", protect, finalizeRepairRequest);
router.patch("/:id/rating", protect, submitRepairRating);
router.patch("/:id/dispute", protect, updateRepairDispute);
router.patch("/:id/claim", protect, claimRepairRequest);

export default router;

import { Router } from "express";
import {
  applyAsSeller,
  applyAsTechnician,
  getMyAccountProfile,
  getMySellerProfile,
  getSellerApplications,
  getSellerDashboardSummary,
  getTechnicianApplications,
  getUsers,
  getWishlist,
  requestSellerPayout,
  reviewTechnicianApplication,
  reviewSellerApplication,
  reviewSellerAppeal,
  reviewSellerPayout,
  submitSellerAppeal,
  toggleWishlist,
  updateMyAccountProfile,
  updateMyChatPreferences,
  updateMyPassword,
  updateSellerProfile
} from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";
import { upload } from "../config/multer.js";

const router = Router();

// Seller appeal endpoints stay under /api/users to reuse the authenticated user context.
router.get("/", protect, authorize("admin"), getUsers);
router.get("/me/profile", protect, getMyAccountProfile);
router.put("/me/profile", protect, upload.single("avatar"), updateMyAccountProfile);
router.put("/me/password", protect, updateMyPassword);
router.patch("/me/chat-preferences", protect, updateMyChatPreferences);
router.post("/seller/apply", protect, applyAsSeller);
router.post("/seller/technician/apply", protect, authorize("seller"), applyAsTechnician);
router.get("/seller/me", protect, getMySellerProfile);
router.put("/seller/me", protect, authorize("seller"), updateSellerProfile);
router.get("/seller/dashboard", protect, authorize("seller"), getSellerDashboardSummary);
router.post("/seller/payout-requests", protect, authorize("seller"), requestSellerPayout);
router.post("/seller/appeal", protect, submitSellerAppeal);
router.get("/seller/applications", protect, authorize("admin"), getSellerApplications);
router.get("/seller/technician/applications", protect, authorize("admin"), getTechnicianApplications);
router.patch("/seller/applications/:id", protect, authorize("admin"), reviewSellerApplication);
router.patch("/seller/technician/applications/:id", protect, authorize("admin"), reviewTechnicianApplication);
router.patch("/seller/applications/:id/appeal", protect, authorize("admin"), reviewSellerAppeal);
router.patch("/seller/:id/payout-requests/:requestId", protect, authorize("admin"), reviewSellerPayout);
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, toggleWishlist);

export default router;

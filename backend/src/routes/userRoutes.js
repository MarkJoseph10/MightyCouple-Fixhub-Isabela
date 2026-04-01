import { Router } from "express";
import {
  applyAsSeller,
  getMySellerProfile,
  getSellerApplications,
  getSellerDashboardSummary,
  getUsers,
  getWishlist,
  requestSellerPayout,
  reviewSellerApplication,
  reviewSellerPayout,
  toggleWishlist,
  updateSellerProfile
} from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getUsers);
router.post("/seller/apply", protect, applyAsSeller);
router.get("/seller/me", protect, getMySellerProfile);
router.put("/seller/me", protect, authorize("seller"), updateSellerProfile);
router.get("/seller/dashboard", protect, authorize("seller"), getSellerDashboardSummary);
router.post("/seller/payout-requests", protect, authorize("seller"), requestSellerPayout);
router.get("/seller/applications", protect, authorize("admin"), getSellerApplications);
router.patch("/seller/applications/:id", protect, authorize("admin"), reviewSellerApplication);
router.patch("/seller/:id/payout-requests/:requestId", protect, authorize("admin"), reviewSellerPayout);
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, toggleWishlist);

export default router;

import { Router } from "express";
import { addReview, getReviewsForProduct } from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/:productId", getReviewsForProduct);
router.post("/:productId", protect, addReview);

export default router;


import { Router } from "express";
import { getUsers, getWishlist, toggleWishlist } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getUsers);
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, toggleWishlist);

export default router;

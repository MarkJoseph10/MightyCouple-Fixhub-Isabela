import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getProductBySlug,
  getProducts,
  getSellerProducts,
  getTagSuggestions,
  reviewSellerProduct,
  updateProduct
} from "../controllers/productController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", getProducts);
router.get("/admin", protect, authorize("admin"), getAdminProducts);
router.get("/seller/mine", protect, authorize("seller"), getSellerProducts);
router.get("/tags/suggestions", protect, authorize("admin", "seller"), getTagSuggestions);
router.get("/:slug", getProductBySlug);
router.post("/", protect, authorize("admin", "seller"), createProduct);
router.put("/:id", protect, authorize("admin", "seller"), updateProduct);
router.delete("/:id", protect, authorize("admin", "seller"), deleteProduct);
router.patch("/:id/review", protect, authorize("admin"), reviewSellerProduct);

export default router;

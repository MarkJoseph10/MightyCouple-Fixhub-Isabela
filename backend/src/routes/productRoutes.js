import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getProductBySlug,
  getProducts,
  getTagSuggestions,
  updateProduct
} from "../controllers/productController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", getProducts);
router.get("/admin", protect, authorize("admin"), getAdminProducts);
router.get("/tags/suggestions", protect, authorize("admin"), getTagSuggestions);
router.get("/:slug", getProductBySlug);
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

export default router;

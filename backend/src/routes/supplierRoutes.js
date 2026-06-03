import { Router } from "express";
import {
  connectSupplier,
  importSupplierProducts,
  syncSupplierProducts
} from "../controllers/supplierController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin"));
router.post("/connect", connectSupplier);
router.post("/import", importSupplierProducts);
router.post("/sync", syncSupplierProducts);

export default router;


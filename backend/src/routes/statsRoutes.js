import { Router } from "express";
import { getDashboardStats, hardResetDashboardTransactions, resetDashboardSalesData } from "../controllers/statsController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin"), getDashboardStats);
router.post("/reset-sales", protect, authorize("admin"), resetDashboardSalesData);
router.post("/hard-reset-transactions", protect, authorize("admin"), hardResetDashboardTransactions);

export default router;

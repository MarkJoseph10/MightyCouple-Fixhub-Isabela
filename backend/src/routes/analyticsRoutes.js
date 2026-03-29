import { Router } from "express";
import { trackCartAdd } from "../controllers/analyticsController.js";

const router = Router();

router.post("/cart-add", trackCartAdd);

export default router;

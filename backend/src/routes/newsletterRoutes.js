import { Router } from "express";
import { subscribeToNewsletter } from "../controllers/newsletterController.js";

const router = Router();

router.post("/", subscribeToNewsletter);

export default router;


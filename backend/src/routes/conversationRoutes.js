import { Router } from "express";
import { uploadChatMedia } from "../config/multer.js";
import {
  blockConversation,
  createOrOpenConversation,
  escalateConversation,
  getConversationById,
  getMyConversations,
  heartbeatConversationPresence,
  markConversationRead,
  reportConversation,
  resolveConversation,
  sendConversationMessage,
  unblockConversation,
  updateConversationTyping
} from "../controllers/conversationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/presence/heartbeat", protect, heartbeatConversationPresence);
router.get("/", protect, getMyConversations);
router.post("/", protect, createOrOpenConversation);
router.get("/:id", protect, getConversationById);
router.post("/:id/messages", protect, uploadChatMedia.array("attachments", 4), sendConversationMessage);
router.patch("/:id/read", protect, markConversationRead);
router.patch("/:id/typing", protect, updateConversationTyping);
router.post("/:id/escalate", protect, escalateConversation);
router.post("/:id/report", protect, reportConversation);
router.post("/:id/block", protect, blockConversation);
router.post("/:id/unblock", protect, unblockConversation);
router.post("/:id/resolve", protect, resolveConversation);

export default router;

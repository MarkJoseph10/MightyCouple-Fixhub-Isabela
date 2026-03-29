import { ContactMessage } from "../models/ContactMessage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { isValidEmail } from "../utils/validators.js";

export const submitContactMessage = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required");
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Please enter a valid email address");
  }

  if (!message?.trim() || String(message).trim().length < 10) {
    throw new ApiError(400, "Message must be at least 10 characters");
  }

  await ContactMessage.create({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    message: String(message).trim()
  });

  res.status(201).json({
    message: "Your message has been sent. We will get back to you soon."
  });
});

export const getContactMessages = asyncHandler(async (_, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 });
  res.json(messages);
});

import { NewsletterSubscriber } from "../models/NewsletterSubscriber.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const subscribeToNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existing = await NewsletterSubscriber.findOne({ email });

  if (existing) {
    res.json({ message: "You are already subscribed" });
    return;
  }

  await NewsletterSubscriber.create({ email });

  res.status(201).json({
    message: "Subscription successful"
  });
});


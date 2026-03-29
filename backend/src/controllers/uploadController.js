import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image uploaded" });
    return;
  }

  res.status(201).json({
    message: "Image uploaded successfully",
    imageUrl: `/uploads/${req.file.filename}`
  });
});


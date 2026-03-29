import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const getUsers = asyncHandler(async (_, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.json(user.wishlist || []);
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const productId = req.params.productId;
  const exists = user.wishlist.some((item) => item.toString() === productId);

  if (exists) {
    user.wishlist = user.wishlist.filter((item) => item.toString() !== productId);
    await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: -1 } });
  } else {
    user.wishlist.push(productId);
    await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: 1 } });
  }

  await user.save();
  res.json({
    productId,
    wished: !exists
  });
});

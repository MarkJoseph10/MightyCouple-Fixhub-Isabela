import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function recalculateProductRating(productId) {
  const reviewStats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  const summary = reviewStats[0] || { averageRating: 0, reviewCount: 0 };

  await Product.findByIdAndUpdate(productId, {
    rating: Number(summary.averageRating || 0).toFixed ? Number(Number(summary.averageRating || 0).toFixed(1)) : 0,
    reviewCount: summary.reviewCount
  });
}

export const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const alreadyReviewed = await Review.findOne({
    product: product._id,
    user: req.user._id
  });

  if (alreadyReviewed) {
    throw new ApiError(400, "You already reviewed this product");
  }

  const verifiedPurchase = Boolean(
    await Order.findOne({
      user: req.user._id,
      "items.product": product._id
    })
  );

  const review = await Review.create({
    product: product._id,
    user: req.user._id,
    guestName: req.user.name,
    avatar: req.user.avatar || "",
    rating: Number(rating),
    comment,
    verifiedPurchase
  });

  await recalculateProductRating(product._id);

  res.status(201).json(review);
});

export const getReviewsForProduct = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .sort({ createdAt: -1 })
    .populate("user", "name avatar");

  res.json(reviews);
});


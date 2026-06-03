import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    guestName: String,
    avatar: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    verifiedPurchase: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Review = mongoose.model("Review", reviewSchema);


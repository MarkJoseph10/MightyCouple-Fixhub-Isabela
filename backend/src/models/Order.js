import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    name: String,
    image: String,
    price: Number,
    costPrice: Number,
    quantity: Number,
    variantId: String,
    variantLabel: String,
    isFreeGift: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phone: String,
    line1: String,
    city: String,
    province: String,
    postalCode: String,
    country: {
      type: String,
      default: "Philippines"
    }
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    label: String,
    status: String,
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const guestCustomerSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phone: String
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    guestCustomer: guestCustomerSchema,
    items: [orderItemSchema],
    shippingAddress: addressSchema,
    pricing: {
      subtotal: Number,
      shipping: Number,
      tax: Number,
      discount: Number,
      total: Number
    },
    payment: {
      method: {
        type: String,
        enum: ["stripe", "paypal", "gcash", "maya", "bank_transfer", "cod"],
        default: "stripe"
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
      },
      transactionId: String,
      clientSecret: String,
      instructions: String,
      proofImage: String,
      proofUploadedAt: Date
    },
    promoCode: String,
    status: {
      type: String,
      enum: ["pending", "verified", "packed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "pending"
    },
    notes: String,
    timeline: [timelineSchema]
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);

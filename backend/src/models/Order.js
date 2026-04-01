import crypto from "crypto";
import mongoose from "mongoose";

function generateOrderNumber() {
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomChunk = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `MC-${dateStamp}-${randomChunk}`;
}

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
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    sellerName: String,
    vendorType: {
      type: String,
      enum: ["admin", "seller"],
      default: "admin"
    },
    commissionRate: {
      type: Number,
      default: 10
    },
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

const refundRequestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded"],
      default: "pending"
    },
    reason: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      trim: true
    },
    proofImage: String,
    requestedAt: Date,
    reviewedAt: Date,
    refundedAt: Date,
    updatedAt: Date,
    adminMessage: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const installmentScheduleItemSchema = new mongoose.Schema(
  {
    sequence: Number,
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ["scheduled", "pending_verification", "paid", "late", "cancelled"],
      default: "scheduled"
    },
    paidAt: Date,
    paymentId: String
  },
  { _id: false }
);

const installmentPaymentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    amount: Number,
    method: {
      type: String,
      enum: ["gcash", "maya", "bank_transfer", "paypal", "stripe"]
    },
    phase: {
      type: String,
      enum: ["down_payment", "installment"],
      default: "installment"
    },
    proofImage: String,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    paymentDate: Date,
    status: {
      type: String,
      enum: ["pending_verification", "approved", "rejected"],
      default: "pending_verification"
    },
    verifiedAt: Date,
    adminNote: String,
    scheduleSequence: Number
  },
  { _id: false }
);

const installmentSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"]
    },
    paymentCount: Number,
    downPaymentPercent: Number,
    downPaymentAmount: Number,
    serviceFeePercent: Number,
    serviceFeeAmount: Number,
    financedAmount: Number,
    installmentAmount: Number,
    totalWithServiceFee: Number,
    amountPaid: {
      type: Number,
      default: 0
    },
    remainingBalance: Number,
    gracePeriodDays: Number,
    releaseCondition: {
      type: String,
      enum: ["after_full_payment", "admin_approved_early_release"]
    },
    agreementAccepted: {
      type: Boolean,
      default: false
    },
    agreementAcceptedAt: Date,
    noRefundAcknowledged: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["active", "pending_verification", "late", "completed", "cancelled"],
      default: "active"
    },
    nextDueDate: Date,
    lastPaidAt: Date,
    releasedEarly: {
      type: Boolean,
      default: false
    },
    earlyReleaseApprovedAt: Date,
    earlyReleaseApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancelledAt: Date,
    cancelledReason: String,
    adminNotes: String,
    schedule: [installmentScheduleItemSchema],
    payments: [installmentPaymentSchema]
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
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
    orderType: {
      type: String,
      enum: ["regular", "installment"],
      default: "regular"
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
    refundRequest: refundRequestSchema,
    installment: installmentSchema,
    notes: String,
    timeline: [timelineSchema]
  },
  { timestamps: true }
);

orderSchema.pre("validate", async function ensureOrderNumber(next) {
  if (this.orderNumber) {
    next();
    return;
  }

  let uniqueOrderNumber = "";
  let exists = true;

  while (exists) {
    uniqueOrderNumber = generateOrderNumber();
    exists = Boolean(await this.constructor.exists({ orderNumber: uniqueOrderNumber }));
  }

  this.orderNumber = uniqueOrderNumber;
  next();
});

export const Order = mongoose.model("Order", orderSchema);

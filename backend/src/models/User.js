import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const sellerApplicationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended"],
      default: "none"
    },
    businessName: String,
    displayName: String,
    phone: String,
    description: String,
    gcashNumber: String,
    bankName: String,
    bankAccountName: String,
    bankAccountNumber: String,
    submittedAt: Date,
    reviewedAt: Date,
    rejectionReason: String,
    adminNote: String
  },
  { _id: false }
);

const sellerPayoutRequestSchema = new mongoose.Schema(
  {
    requestCode: String,
    requestedAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending"
    },
    note: String,
    adminNote: String,
    approvedReference: String,
    paidReference: String,
    requestedAt: Date,
    reviewedAt: Date,
    paidAt: Date
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: false
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local"
    },
    googleId: {
      type: String,
      default: ""
    },
    facebookId: {
      type: String,
      default: ""
    },
    role: {
      type: String,
      enum: ["admin", "customer", "seller"],
      default: "customer"
    },
    avatar: String,
    phone: String,
    lastLoginAt: Date,
    sellerProfile: {
      storeName: String,
      displayName: String,
      description: String,
      avatar: String,
      banner: String,
      statusNote: String,
      commissionRate: {
        type: Number,
        default: 10
      },
      isActive: {
        type: Boolean,
        default: false
      },
      approvedAt: Date,
      payoutDetails: {
        gcashNumber: String,
        bankName: String,
        bankAccountName: String,
        bankAccountNumber: String
      },
      payoutRequests: [sellerPayoutRequestSchema],
      totalPayoutApproved: {
        type: Number,
        default: 0
      },
      totalPayoutPaid: {
        type: Number,
        default: 0
      }
    },
    sellerApplication: {
      type: sellerApplicationSchema,
      default: () => ({})
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password") || !this.password) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);

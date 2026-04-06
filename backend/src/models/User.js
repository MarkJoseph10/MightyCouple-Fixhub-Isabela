import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const sellerApplicationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended", "terminated"],
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

const sellerPayoutDetailsSchema = new mongoose.Schema(
  {
    gcashNumber: {
      type: String,
      default: ""
    },
    bankName: {
      type: String,
      default: ""
    },
    bankAccountName: {
      type: String,
      default: ""
    },
    bankAccountNumber: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const sellerDisciplinaryEntrySchema = new mongoose.Schema(
  {
    offenseNumber: {
      type: Number,
      default: 0
    },
    action: {
      type: String,
      enum: ["warning", "suspension", "termination"],
      default: "warning"
    },
    durationDays: {
      type: Number,
      default: 0
    },
    note: String,
    createdAt: Date,
    endsAt: Date
  },
  { _id: false }
);

const sellerAppealSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none"
    },
    message: {
      type: String,
      default: ""
    },
    submittedAt: Date,
    reviewedAt: Date,
    adminNote: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const technicianApplicationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended"],
      default: "none"
    },
    specialties: {
      type: [String],
      default: []
    },
    experienceSummary: {
      type: String,
      default: ""
    },
    yearsExperience: {
      type: Number,
      default: 0
    },
    contactNumber: {
      type: String,
      default: ""
    },
    servicePoints: {
      type: [String],
      default: []
    },
    pickupMethods: {
      type: [String],
      default: ["drop_off"]
    },
    submittedAt: Date,
    reviewedAt: Date,
    approvedAt: Date,
    rejectionReason: {
      type: String,
      default: ""
    },
    adminNote: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const userPresenceSchema = new mongoose.Schema(
  {
    lastActiveAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const userChatPreferenceSchema = new mongoose.Schema(
  {
    emailAlertsEnabled: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: "",
      trim: true
    },
    lastName: {
      type: String,
      default: "",
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
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
    birthDate: Date,
    gender: {
      type: String,
      enum: ["", "male", "female", "prefer_not_to_say"],
      default: ""
    },
    lastLoginAt: Date,
    sellerProfile: {
      storeName: String,
      displayName: String,
      description: String,
      avatar: String,
      banner: String,
      servicePoints: {
        type: [String],
        default: []
      },
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
        type: sellerPayoutDetailsSchema,
        default: () => ({})
      },
      payoutRequests: [sellerPayoutRequestSchema],
      totalPayoutApproved: {
        type: Number,
        default: 0
      },
      totalPayoutPaid: {
        type: Number,
        default: 0
      },
      discipline: {
        type: new mongoose.Schema(
          {
            offenseCount: {
              type: Number,
              default: 0
            },
            currentStage: {
              type: String,
              enum: ["good_standing", "warning", "suspended", "terminated"],
              default: "good_standing"
            },
            suspendedAt: Date,
            suspendedUntil: Date,
            terminatedAt: Date,
            lastReason: {
              type: String,
              default: ""
            },
            history: {
              type: [sellerDisciplinaryEntrySchema],
              default: []
            }
          },
          { _id: false }
        ),
        default: () => ({})
      },
      appeal: {
        type: sellerAppealSchema,
        default: () => ({})
      }
    },
    sellerApplication: {
      type: sellerApplicationSchema,
      default: () => ({})
    },
    technicianApplication: {
      type: technicianApplicationSchema,
      default: () => ({})
    },
    presence: {
      type: userPresenceSchema,
      default: () => ({})
    },
    chatPreferences: {
      type: userChatPreferenceSchema,
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

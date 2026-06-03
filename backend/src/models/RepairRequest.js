import crypto from "crypto";
import mongoose from "mongoose";

function generateRepairRequestNumber() {
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomChunk = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RPR-${dateStamp}-${randomChunk}`;
}

const repairAttachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      default: ""
    },
    mimeType: {
      type: String,
      default: ""
    },
    sizeBytes: {
      type: Number,
      default: 0
    },
    publicId: {
      type: String,
      default: ""
    },
    width: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    },
    durationSeconds: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const repairDeviceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true
    },
    brand: {
      type: String,
      default: "",
      trim: true
    },
    model: {
      type: String,
      default: "",
      trim: true
    },
    serialNumber: {
      type: String,
      default: "",
      trim: true
    },
    color: {
      type: String,
      default: "",
      trim: true
    },
    accessories: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: false }
);

const repairTimelineEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      default: "",
      trim: true
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorRole: {
      type: String,
      enum: ["admin", "customer", "seller", "system"],
      default: "system"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const repairAuditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorRole: {
      type: String,
      enum: ["admin", "customer", "seller", "system"],
      default: "system"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const repairQuoteSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending_customer", "approved", "rejected"],
      default: "none"
    },
    laborFee: {
      type: Number,
      default: 0
    },
    partsFee: {
      type: Number,
      default: 0
    },
    otherFee: {
      type: Number,
      default: 0
    },
    approvedAmount: {
      type: Number,
      default: 0
    },
    estimatedCompletionAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    preparedByRole: {
      type: String,
      enum: ["admin", "seller", null],
      default: null
    },
    preparedAt: {
      type: Date,
      default: null
    },
    customerRespondedAt: {
      type: Date,
      default: null
    },
    customerResponseNote: {
      type: String,
      default: "",
      trim: true
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "waived"],
      default: "unpaid"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "maya", "bank_transfer", "paypal", "stripe", ""],
      default: ""
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const repairSlotSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "",
      trim: true
    },
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["available", "booked", "cancelled", "unavailable"],
      default: "available"
    },
    note: {
      type: String,
      default: "",
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    createdByRole: {
      type: String,
      enum: ["admin", "seller", null],
      default: null
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    bookedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },
  { _id: true }
);

const repairPartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    cost: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: "",
      trim: true
    },
    linkedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    }
  },
  { _id: true }
);

const repairWarrantySchema = new mongoose.Schema(
  {
    durationDays: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      default: null
    },
    note: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: false }
);

const repairRatingSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      default: "",
      trim: true
    },
    createdAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const repairDisputeSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "open", "resolved"],
      default: "none"
    },
    reason: {
      type: String,
      default: "",
      trim: true
    },
    message: {
      type: String,
      default: "",
      trim: true
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    openedByRole: {
      type: String,
      enum: ["admin", "customer", "seller", null],
      default: null
    },
    openedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNote: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: false }
);

const repairRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    serviceType: {
      type: String,
      enum: ["repair"],
      default: "repair"
    },
    status: {
      type: String,
      enum: [
        "pending",
        "reviewing",
        "quoted",
        "approved",
        "rejected",
        "scheduled",
        "in_progress",
        "waiting_parts",
        "ready_for_pickup",
        "completed",
        "cancelled"
      ],
      default: "pending",
      index: true
    },
    branchLabel: {
      type: String,
      default: "",
      trim: true
    },
    pickupMethod: {
      type: String,
      enum: ["drop_off", "pickup"],
      default: "drop_off"
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    },
    alternateContact: {
      type: String,
      default: "",
      trim: true
    },
    device: {
      type: repairDeviceSchema,
      required: true
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true
    },
    preferredScheduleAt: {
      type: Date,
      default: null
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    scheduleNotes: {
      type: String,
      default: "",
      trim: true
    },
    availableSlots: {
      type: [repairSlotSchema],
      default: []
    },
    reportedIssueAttachments: {
      type: [repairAttachmentSchema],
      default: []
    },
    beforeRepairAttachments: {
      type: [repairAttachmentSchema],
      default: []
    },
    diagnosisAttachments: {
      type: [repairAttachmentSchema],
      default: []
    },
    afterRepairAttachments: {
      type: [repairAttachmentSchema],
      default: []
    },
    proofOfCompletionAttachments: {
      type: [repairAttachmentSchema],
      default: []
    },
    quote: {
      type: repairQuoteSchema,
      default: () => ({})
    },
    partsUsed: {
      type: [repairPartSchema],
      default: []
    },
    slaHours: {
      type: Number,
      default: 72
    },
    dueAt: {
      type: Date,
      default: null
    },
    technicianNotes: {
      type: String,
      default: "",
      trim: true
    },
    finalSummary: {
      type: String,
      default: "",
      trim: true
    },
    warranty: {
      type: repairWarrantySchema,
      default: () => ({})
    },
    rating: {
      type: repairRatingSchema,
      default: () => ({})
    },
    dispute: {
      type: repairDisputeSchema,
      default: () => ({})
    },
    claimOtp: {
      type: String,
      default: "",
      trim: true
    },
    claimOtpExpiresAt: {
      type: Date,
      default: null
    },
    pickedUpAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    timeline: {
      type: [repairTimelineEntrySchema],
      default: []
    },
    auditTrail: {
      type: [repairAuditEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

repairRequestSchema.index({ customer: 1, createdAt: -1 });
repairRequestSchema.index({ seller: 1, status: 1, createdAt: -1 });
repairRequestSchema.index({ status: 1, createdAt: -1 });

repairRequestSchema.pre("validate", async function ensureRequestNumber(next) {
  if (this.requestNumber) {
    next();
    return;
  }

  let candidate = "";
  let exists = true;

  while (exists) {
    candidate = generateRepairRequestNumber();
    exists = Boolean(await this.constructor.exists({ requestNumber: candidate }));
  }

  this.requestNumber = candidate;
  next();
});

export const RepairRequest = mongoose.model("RepairRequest", repairRequestSchema);

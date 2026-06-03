import mongoose from "mongoose";

const conversationAttachmentSchema = new mongoose.Schema(
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
  { _id: false }
);

const conversationTypingStateSchema = new mongoose.Schema(
  {
    isTyping: {
      type: Boolean,
      default: false
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    role: {
      type: String,
      enum: ["admin", "customer", "seller", null],
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const conversationReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reporterRole: {
      type: String,
      enum: ["admin", "customer", "seller"],
      required: true
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
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    resolutionNote: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: true }
);

const conversationMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    senderRole: {
      type: String,
      enum: ["admin", "customer", "seller"],
      required: true
    },
    text: {
      type: String,
      default: "",
      trim: true
    },
    attachments: {
      type: [conversationAttachmentSchema],
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    contextType: {
      type: String,
      enum: ["product", "order", "repair"],
      default: "product"
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },
    repairRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepairRequest",
      default: null
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
    subject: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["open", "waiting_customer", "waiting_seller", "waiting_admin", "resolved", "blocked"],
      default: "open"
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    lastMessageSenderRole: {
      type: String,
      enum: ["", "admin", "customer", "seller"],
      default: ""
    },
    lastMessagePreview: {
      type: String,
      default: ""
    },
    hasAttachments: {
      type: Boolean,
      default: false
    },
    unread: {
      customer: {
        type: Number,
        default: 0
      },
      seller: {
        type: Number,
        default: 0
      },
      admin: {
        type: Number,
        default: 0
      }
    },
    lastReadAt: {
      customer: {
        type: Date,
        default: null
      },
      seller: {
        type: Date,
        default: null
      },
      admin: {
        type: Date,
        default: null
      }
    },
    typing: {
      customer: {
        type: conversationTypingStateSchema,
        default: () => ({})
      },
      seller: {
        type: conversationTypingStateSchema,
        default: () => ({})
      },
      admin: {
        type: conversationTypingStateSchema,
        default: () => ({})
      }
    },
    escalation: {
      active: {
        type: Boolean,
        default: false
      },
      reason: {
        type: String,
        default: "",
        trim: true
      },
      createdAt: {
        type: Date,
        default: null
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      createdByRole: {
        type: String,
        enum: ["admin", "customer", "seller", null],
        default: null
      },
      resolvedAt: {
        type: Date,
        default: null
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    },
    moderation: {
      blockedAt: {
        type: Date,
        default: null
      },
      blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      blockedByRole: {
        type: String,
        enum: ["admin", "customer", "seller", null],
        default: null
      },
      blockReason: {
        type: String,
        default: "",
        trim: true
      },
      reports: {
        type: [conversationReportSchema],
        default: []
      }
    },
    messages: {
      type: [conversationMessageSchema],
      default: []
    }
  },
  { timestamps: true }
);

conversationSchema.index({ customer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });
conversationSchema.index({ product: 1, customer: 1, lastMessageAt: -1 });
conversationSchema.index({ order: 1, customer: 1, lastMessageAt: -1 });
conversationSchema.index({ repairRequest: 1, customer: 1, lastMessageAt: -1 });
conversationSchema.index({ contextType: 1, status: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);

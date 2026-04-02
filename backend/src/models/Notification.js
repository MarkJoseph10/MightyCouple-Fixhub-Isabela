import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    recipientRole: {
      type: String,
      enum: ["admin", "customer", "seller"],
      default: null,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true
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
    link: {
      type: String,
      default: "",
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUser: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);

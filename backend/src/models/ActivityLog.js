import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorRole: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    category: {
      type: String,
      default: "system",
      trim: true,
      index: true
    },
    action: {
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
    subjectType: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    subjectId: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    severity: {
      type: String,
      default: "info",
      enum: ["info", "success", "warning", "danger"],
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1, category: 1, action: 1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

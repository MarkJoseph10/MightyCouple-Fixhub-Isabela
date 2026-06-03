import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { getDashboardAnalytics, hardResetTransactionData, resetSalesAnalytics } from "../services/analyticsService.js";

async function verifyAdminResetPassword(userId, currentPassword) {
  if (!String(currentPassword || "").trim()) {
    throw new ApiError(400, "Admin password confirmation is required");
  }

  const admin = await User.findById(userId);

  if (!admin) {
    throw new ApiError(404, "Admin account not found");
  }

  if (!admin.password) {
    throw new ApiError(400, "This admin account does not support password confirmation here");
  }

  const matches = await admin.comparePassword(String(currentPassword));

  if (!matches) {
    throw new ApiError(401, "Admin password is incorrect");
  }
}

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardAnalytics({ range: req.query?.range || "all" });
  res.json(stats);
});

export const resetDashboardSalesData = asyncHandler(async (req, res) => {
  await verifyAdminResetPassword(req.user?._id, req.body?.currentPassword);

  const result = await resetSalesAnalytics();
  res.json({
    message: "Sales analytics reset. Dashboard metrics will now track only new orders and cart activity.",
    resetAt: result.resetAt
  });
});

export const hardResetDashboardTransactions = asyncHandler(async (req, res) => {
  await verifyAdminResetPassword(req.user?._id, req.body?.currentPassword);

  const result = await hardResetTransactionData();
  res.json({
    message: "Test orders, installment transactions, refund history, and order-related activity logs were deleted.",
    resetAt: result.resetAt,
    deleted: {
      orders: result.ordersDeleted,
      activityLogs: result.activityLogsDeleted
    }
  });
});

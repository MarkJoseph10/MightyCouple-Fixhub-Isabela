import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboardAnalytics, hardResetTransactionData, resetSalesAnalytics } from "../services/analyticsService.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardAnalytics({ range: req.query?.range || "all" });
  res.json(stats);
});

export const resetDashboardSalesData = asyncHandler(async (_req, res) => {
  const result = await resetSalesAnalytics();
  res.json({
    message: "Sales analytics reset. Dashboard metrics will now track only new orders and cart activity.",
    resetAt: result.resetAt
  });
});

export const hardResetDashboardTransactions = asyncHandler(async (_req, res) => {
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

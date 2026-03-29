import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboardAnalytics } from "../services/analyticsService.js";

export const getDashboardStats = asyncHandler(async (_, res) => {
  const stats = await getDashboardAnalytics();
  res.json(stats);
});


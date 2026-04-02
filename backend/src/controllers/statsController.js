import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboardAnalytics } from "../services/analyticsService.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardAnalytics({ range: req.query?.range || "all" });
  res.json(stats);
});

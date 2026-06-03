import { asyncHandler } from "../utils/asyncHandler.js";
import { registerRealtimeClient } from "../services/realtimeService.js";

export const openRealtimeStream = asyncHandler(async (req, res) => {
  const cleanup = registerRealtimeClient({
    userId: req.user._id,
    role: req.user.role,
    res
  });

  req.on("close", cleanup);
  req.on("end", cleanup);
});


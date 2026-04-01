import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeSellerSuspensionState } from "../utils/sellerDiscipline.js";

export async function protect(req, _, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      next(new ApiError(401, "User not found"));
      return;
    }

    if (normalizeSellerSuspensionState(user)) {
      await user.save();
    }

    req.user = user;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export async function optionalAuth(req, _, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("-password");

    if (user) {
      if (normalizeSellerSuspensionState(user)) {
        await user.save();
      }
      req.user = user;
    }
  } catch {
    req.user = null;
  }

  next();
}

export function authorize(...roles) {
  return (req, _, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to perform this action"));
      return;
    }

    if (req.user.role === "seller" && req.user.sellerProfile?.isActive === false) {
      const discipline = req.user.sellerProfile?.discipline;
      if (discipline?.currentStage === "terminated" || discipline?.terminatedAt) {
        next(new ApiError(403, "Seller access has been terminated"));
        return;
      }

      if (discipline?.suspendedUntil) {
        next(new ApiError(403, `Seller access is suspended until ${new Date(discipline.suspendedUntil).toLocaleString("en-PH")}`));
        return;
      }

      next(new ApiError(403, "Seller access is currently suspended"));
      return;
    }

    next();
  };
}

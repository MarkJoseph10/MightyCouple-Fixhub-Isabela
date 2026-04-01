import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { createToken } from "../utils/createToken.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearRateLimitFailures, recordRateLimitFailure } from "../middleware/rateLimit.js";
import { isValidEmail } from "../utils/validators.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    sellerProfile: user.sellerProfile || null,
    sellerApplication: user.sellerApplication || null
  };
}

function validatePassword(password) {
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!strongPassword.test(password)) {
    throw new ApiError(400, "Password must be at least 8 characters and include uppercase, lowercase, and a number");
  }
}

async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) {
    throw new ApiError(500, "Google login is not configured on the server");
  }

  if (!credential) {
    throw new ApiError(400, "Google credential is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.googleClientId
  });
  const payload = ticket.getPayload();

  if (!payload?.email || !payload?.sub) {
    throw new ApiError(401, "Unable to verify Google account");
  }

  return payload;
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required");
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Please enter a valid email address");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "Email is already in use");
  }

  validatePassword(password);

  const user = await User.create({
    name,
    email,
    password,
    authProvider: "local",
    role: "customer"
  });

  const token = createToken(user._id, user.role, env.jwtSecret);

  res.status(201).json({
    message: "Account created successfully",
    token,
    user: formatUser(user)
  });
});

export const loginWithGoogle = asyncHandler(async (req, res) => {
  const payload = await verifyGoogleCredential(req.body?.credential);
  const email = String(payload.email || "").trim().toLowerCase();

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      password: "",
      authProvider: "google",
      googleId: payload.sub,
      avatar: payload.picture || "",
      role: "customer"
    });
  } else {
    const nextName = user.name || payload.name || email.split("@")[0];
    const nextAvatar = user.avatar || payload.picture || "";

    user.name = nextName;
    user.avatar = nextAvatar;
    user.googleId = payload.sub;
    user.authProvider = user.authProvider === "local" && user.password ? "local" : "google";
    user.lastLoginAt = new Date();
    await user.save();
  }

  if (!user.lastLoginAt) {
    user.lastLoginAt = new Date();
    await user.save();
  }

  const token = createToken(user._id, user.role, env.jwtSecret);

  res.json({
    message: "Google login successful",
    token,
    user: formatUser(user)
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    recordRateLimitFailure(req);
    throw new ApiError(400, "Please enter a valid email address");
  }

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    recordRateLimitFailure(req);
    throw new ApiError(401, "Invalid email or password");
  }

  clearRateLimitFailures(req);
  user.lastLoginAt = new Date();
  await user.save();

  const token = createToken(user._id, user.role, env.jwtSecret);

  res.json({
    message: "Login successful",
    token,
    user: formatUser(user)
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});

export const updateAdminCredentials = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!currentPassword) {
    throw new ApiError(400, "Current password is required");
  }

  const admin = await User.findById(req.user._id);

  if (!admin || admin.role !== "admin") {
    throw new ApiError(403, "Only admins can update these credentials");
  }

  const passwordMatches = await admin.comparePassword(currentPassword);

  if (!passwordMatches) {
    throw new ApiError(401, "Current password is incorrect");
  }

  if (email && email !== admin.email) {
    if (!isValidEmail(email)) {
      throw new ApiError(400, "Please enter a valid email address");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ApiError(400, "That email is already in use");
    }

    admin.email = email;
  }

  if (newPassword) {
    validatePassword(newPassword);
    admin.password = newPassword;
  }

  await admin.save();

  res.json({
    message: "Admin credentials updated successfully",
    user: formatUser(admin)
  });
});

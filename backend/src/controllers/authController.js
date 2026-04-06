import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { createToken } from "../utils/createToken.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearRateLimitFailures, recordRateLimitFailure } from "../middleware/rateLimit.js";
import { isValidEmail } from "../utils/validators.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

function splitNameParts(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

function formatUser(user) {
  const birthDate =
    user.role === "admin" || !user.birthDate
      ? ""
      : new Date(user.birthDate).toISOString().slice(0, 10);

  return {
    id: user._id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    birthDate,
    gender: user.role === "admin" ? "" : user.gender || "",
    avatar: user.avatar || "",
    role: user.role,
    authProvider: user.authProvider || "local",
    hasPassword: Boolean(user.password),
    chatPreferences: user.chatPreferences || null,
    sellerProfile: user.sellerProfile || null,
    sellerApplication: user.sellerApplication || null,
    technicianApplication: user.technicianApplication || null
  };
}

function validatePassword(password) {
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!strongPassword.test(password)) {
    throw new ApiError(400, "Password must be at least 8 characters and include uppercase, lowercase, and a number");
  }
}

async function verifyGoogleCredential({ credential, accessToken }) {
  if (!env.googleClientId) {
    throw new ApiError(500, "Google login is not configured on the server");
  }

  if (!credential && !accessToken) {
    throw new ApiError(400, "Google credential is required");
  }

  if (accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await response.json();

    if (!response.ok || !payload?.email || !payload?.sub) {
      throw new ApiError(401, payload?.error_description || payload?.message || "Unable to verify Google account");
    }

    return payload;
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

async function verifyFacebookAccessToken(accessToken) {
  if (!env.facebookAppId || !env.facebookAppSecret) {
    throw new ApiError(500, "Facebook login is not configured on the server");
  }

  if (!accessToken) {
    throw new ApiError(400, "Facebook access token is required");
  }

  const appAccessToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  const debugResponse = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`
  );
  const debugData = await debugResponse.json();

  if (!debugResponse.ok || !debugData?.data?.is_valid) {
    throw new ApiError(401, debugData?.error?.message || "Unable to verify Facebook account");
  }

  if (String(debugData.data.app_id || "") !== String(env.facebookAppId)) {
    throw new ApiError(401, "Facebook app mismatch");
  }

  const userResponse = await fetch(
    `https://graph.facebook.com/me?fields=id,name,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
  );
  const userData = await userResponse.json();

  if (!userResponse.ok || !userData?.id) {
    throw new ApiError(401, userData?.error?.message || "Unable to fetch Facebook account");
  }

  return userData;
}

export const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, contact, password, birthDate, gender } = req.body;
  const cleanFirstName = String(firstName || "").trim();
  const cleanLastName = String(lastName || "").trim();
  const cleanContact = String(contact || "").trim();
  const normalizedGender = ["male", "female", "prefer_not_to_say"].includes(String(gender || "").trim())
    ? String(gender || "").trim()
    : "";

  if (!cleanFirstName || !cleanLastName) {
    throw new ApiError(400, "First name and last name are required");
  }

  if (!cleanContact) {
    throw new ApiError(400, "Mobile number or email is required");
  }

  let email = "";
  let phone = "";

  if (isValidEmail(cleanContact)) {
    email = cleanContact.toLowerCase();
  } else {
    const digits = cleanContact.replace(/\D/g, "");

    if (!/^(\+63|0)?9\d{9}$/.test(cleanContact.replace(/[\s-]/g, ""))) {
      throw new ApiError(400, "Please enter a valid email address or Philippine mobile number");
    }

    phone =
      digits.startsWith("63") && digits.length === 12
        ? `+${digits}`
        : digits.startsWith("09") && digits.length === 11
          ? `+63${digits.slice(1)}`
          : digits.startsWith("9") && digits.length === 10
            ? `+63${digits}`
            : cleanContact;
  }

  if (!birthDate) {
    throw new ApiError(400, "Birthday is required");
  }

  const parsedBirthDate = new Date(birthDate);

  if (Number.isNaN(parsedBirthDate.getTime())) {
    throw new ApiError(400, "Please enter a valid birthday");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedBirthDate.setHours(0, 0, 0, 0);

  if (parsedBirthDate > today) {
    throw new ApiError(400, "Birthday cannot be in the future");
  }

  if (parsedBirthDate.getFullYear() < 1900) {
    throw new ApiError(400, "Please enter a realistic birthday");
  }

  const existingUser = await User.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : [])
    ]
  });

  if (existingUser) {
    throw new ApiError(400, email ? "Email is already in use" : "Mobile number is already in use");
  }

  validatePassword(password);

  const user = await User.create({
    firstName: cleanFirstName,
    lastName: cleanLastName,
    name: `${cleanFirstName} ${cleanLastName}`.trim(),
    ...(email ? { email } : {}),
    phone,
    password,
    birthDate: parsedBirthDate,
    gender: normalizedGender,
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
  const payload = await verifyGoogleCredential({
    credential: req.body?.credential,
    accessToken: req.body?.accessToken
  });
  const email = String(payload.email || "").trim().toLowerCase();

  let user = await User.findOne({ email });

  if (!user) {
    const { firstName, lastName } = splitNameParts(payload.name || email.split("@")[0]);
    user = await User.create({
      name: payload.name || email.split("@")[0],
      firstName,
      lastName,
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
    const nextParts = splitNameParts(payload.name || nextName);

    user.name = nextName;
    user.firstName = user.firstName || nextParts.firstName;
    user.lastName = user.lastName || nextParts.lastName;
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

export const loginWithFacebook = asyncHandler(async (req, res) => {
  const payload = await verifyFacebookAccessToken(req.body?.accessToken);
  const email = String(payload.email || "").trim().toLowerCase();
  const fallbackEmail = `${payload.id}@facebook.local`;

  let user = await User.findOne({ facebookId: payload.id });

  if (!user && email) {
    user = await User.findOne({ email });
  }

  if (!user) {
    user = await User.findOne({ email: fallbackEmail });
  }

  if (!user) {
    const fallbackName = payload.name || email.split("@")[0] || `facebook-${payload.id.slice(-6)}`;
    const { firstName, lastName } = splitNameParts(fallbackName);
    user = await User.create({
      name: fallbackName,
      firstName,
      lastName,
      email: email || fallbackEmail,
      password: "",
      authProvider: "facebook",
      facebookId: payload.id,
      avatar: payload.picture?.data?.url || "",
      role: "customer"
    });
  } else {
    const fallbackName = payload.name || email.split("@")[0] || `facebook-${payload.id.slice(-6)}`;
    const nextParts = splitNameParts(fallbackName);
    user.name = user.name || fallbackName;
    user.firstName = user.firstName || nextParts.firstName;
    user.lastName = user.lastName || nextParts.lastName;
    user.avatar = user.avatar || payload.picture?.data?.url || "";
    user.facebookId = payload.id;
    if (!user.email && email) {
      user.email = email;
    }
    user.authProvider = user.authProvider === "local" && user.password ? "local" : "facebook";
    user.lastLoginAt = new Date();
    await user.save();
  }

  if (!user.lastLoginAt) {
    user.lastLoginAt = new Date();
    await user.save();
  }

  const token = createToken(user._id, user.role, env.jwtSecret);

  res.json({
    message: "Facebook login successful",
    token,
    user: formatUser(user)
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const identifier = String(req.body?.email || req.body?.identifier || "").trim();
  const { password } = req.body;

  if (!identifier) {
    recordRateLimitFailure(req);
    throw new ApiError(400, "Please enter your email or mobile number");
  }

  let user = null;

  if (isValidEmail(identifier)) {
    user = await User.findOne({ email: identifier.toLowerCase() });
  } else if (/^(\+63|0)?9\d{9}$/.test(identifier.replace(/[\s-]/g, ""))) {
    const digits = identifier.replace(/\D/g, "");
    const phone =
      digits.startsWith("63") && digits.length === 12
        ? `+${digits}`
        : digits.startsWith("09") && digits.length === 11
          ? `+63${digits.slice(1)}`
          : digits.startsWith("9") && digits.length === 10
            ? `+63${digits}`
            : identifier;
    user = await User.findOne({ phone });
  } else {
    recordRateLimitFailure(req);
    throw new ApiError(400, "Please enter a valid email address or Philippine mobile number");
  }

  if (!user || !(await user.comparePassword(password))) {
    recordRateLimitFailure(req);
    throw new ApiError(401, "Invalid email/mobile number or password");
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
  res.json(formatUser(req.user));
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

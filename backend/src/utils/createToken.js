import jwt from "jsonwebtoken";

export function createToken(userId, role, jwtSecret) {
  return jwt.sign({ userId, role }, jwtSecret, { expiresIn: "7d" });
}


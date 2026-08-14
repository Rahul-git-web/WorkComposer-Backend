import jwt from "jsonwebtoken";

export const generateAccessToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "15s" });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";
import sendEmail from "../utils/sendEmail.js";
import verifyEmailTemplate from "../templates/veifyEmailTemplate.js";
import Organization from "../models/organization.model.js";

// Register Controller

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, organization, password } = req.body;

    if (!firstName || !lastName || !email || !organization || !password) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const organizationDoc = await Organization.create({
      name: organization,
    });
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      organization: organizationDoc._id,
      password: hashedPassword,
      role: "owner",
      verificationToken,
      verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000,
    });

    console.log("USER CREATED:", user);

    // Verification Link
    const verifyUrl = `http://localhost:5000/api/auth/verify/${verificationToken}`;

    // Send Email
    const html = verifyEmailTemplate({
      verifyUrl,
      firstName: user.firstName,
    });

    await sendEmail(user.email, "Verify your email", html);

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Login Controller

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const deviceInfo = {
      ip: req.ip || req.headers["x-forwarded-for"] || "Unknown IP",

      location: "India",

      hostname: req.headers["user-agent"] || "Unknown Device",

      platform: req.headers["sec-ch-ua-platform"] || "Unknown Platform",

      appVersion: "1.0.0",

      loginTime: new Date(),

      lastSync: new Date(),

      isOnline: true,
    };

    user.devices.push(deviceInfo);

    const accessToken = generateAccessToken(user._id);

    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;

    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Refresh Access Token

export const refreshAccessToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        message: "No refresh token provided",
      });
    }

    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== oldRefreshToken) {
      return res.status(403).json({
        message: "Refresh token mismatch",
      });
    }

    const newRefreshToken = generateRefreshToken(user._id);
    const newAccessToken = generateAccessToken(decoded.userId);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      message: "Token refreshed",
    });
  } catch (err) {
    console.error(err.message);
    return res.status(403).json({
      message: "Invalid or expired refresh token",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("VERIFY TOKEN:", token);

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.send("Invalid or expired token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;

    await user.save();

    console.log("EMAIL VERIFIED");

    return res.redirect(
  "http://localhost:3000/authenticate/login?verified=true"
);

  } catch (err) {
    console.log(err);

    return res.status(500).send(err.message);
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.verificationToken = verificationToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const verifyUrl = `http://localhost:5000/api/auth/verify/${verificationToken}`;

    const html = verifyEmailTemplate({
      verifyUrl,
      firstName: user.firstName,
    });

    await sendEmail(user.email, "Verify your email", html);

    res.json({
      message: "Verification email sent again",
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl = `http://localhost:3000/authenticate/reset-password?token=${resetToken}`;

    await sendEmail(
      user.email,
      "Reset Password",
      `<a href="${resetUrl}">Reset Password</a>`,
    );

    res.json({
      message: "Reset link sent to email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  console.log("Token from request:", token);

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() },
  });

  console.log("User found:", user);

  if (!user) {
    return res.status(400).json({
      message: "Invalid or expired token",
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;

  await user.save();

  res.json({ message: "Password updated successfully" });
};

import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import path from "path";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password -refreshToken");

    res.status(200).json(user);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword, signOutAllDevices } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateData = {
      password: hashedPassword,
    };

    if (signOutAllDevices) {
      updateData.refreshToken = null;

      updateData.devices = [];
    }

    await User.findByIdAndUpdate(req.user._id, updateData);

    res.json({
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update password",
    });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { weeklyReport, dailyReport, reportTeam, reportTimezone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        weeklyReport,
        dailyReport,
        reportTeam,
        reportTimezone,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("reportTeam")
      .select("-password -refreshToken");

    res.status(200).json(user);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update preferences",
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      // Remove temporary uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        message: "User not found",
      });
    }

    // Upload avatar to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "workcomposer/avatars",
      resource_type: "image",
    });

    // Remove temporary local file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Save permanent Cloudinary URL
    user.avatar = result.secure_url;

    await user.save();

    res.status(200).json({
      message: "Avatar updated successfully",
      avatar: result.secure_url,
    });
  } catch (err) {
    console.error("AVATAR UPLOAD ERROR:", err);

    // Clean up temporary file if upload/save fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      message: "Failed to upload avatar",
    });
  }
};

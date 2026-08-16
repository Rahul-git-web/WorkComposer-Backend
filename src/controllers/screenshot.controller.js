import cloudinary from "../config/cloudinary.js";
import Screenshot from "../models/screenshot.model.js";
import fs from "fs";
import archiver from "archiver";
import axios from "axios";
import { getAvatarUrl } from "../utils/avatar.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { getUserTimezone, getDateRangeUTC } from "../utils/timezone.js";

// UPLOAD SCREENSHOTS
export const uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "workcomposer/screenshots",
    });

    const screenshot = await Screenshot.create({
      user: req.user._id,

      project: req.body.project || null,
      task: req.body.task || null,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      appName: req.body.appName || "",
      windowTitle: req.body.windowTitle || "",
      keyPresses: Number(req.body.keyPresses || 0),
      mouseClicks: Number(req.body.mouseClicks || 0),
      mouseMoves: Number(req.body.mouseMoves || 0),
      activityScore: Number(req.body.activityScore || 0),
      capturedAt: new Date(),
    });

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      screenshot,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// GET SCREENSHOTS
export const getScreenshots = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const currentUser = await User.findById(req.user._id).select(
      "roleRef reportTimezone",
    );

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const role = await Role.findById(currentUser.roleRef).select(
      "screenshotAccess",
    );

    const screenshotAccess = role?.screenshotAccess || "none";

    if (screenshotAccess === "none") {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    const timezone = getUserTimezone(currentUser);

    let query = {};

    if (screenshotAccess === "own") {
      query.user = req.user._id;
    }

    if (screenshotAccess === "managed") {
      const managedUsers = await User.find({
        manager: req.user._id,
      }).select("_id");

      query.user = {
        $in: managedUsers.map((user) => user._id),
      };
    }

    if (startDate && endDate) {
      const { start, end } = getDateRangeUTC(startDate, endDate, timezone);

      query.capturedAt = {
        $gte: start,
        $lte: end,
      };
    }

    const screenshots = await Screenshot.find(query)
      .populate("user", "firstName lastName email team avatar")
      .sort({ capturedAt: -1 });

    const formattedScreenshots = screenshots.map((shot) => ({
      ...shot.toObject(),
      user: shot.user
        ? {
            ...shot.user.toObject(),
            avatar: getAvatarUrl(shot.user.avatar),
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      screenshots: formattedScreenshots,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET USER SCREENSHOT
export const getUserScreenshots = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const currentUser = await User.findById(req.user._id).select("roleRef");

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const role = await Role.findById(currentUser.roleRef).select(
      "screenshotAccess",
    );

    const screenshotAccess = role?.screenshotAccess || "none";

    if (screenshotAccess === "none") {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    if (screenshotAccess === "managed") {
      const targetUser = await User.findById(userId).select("manager");

      if (
        !targetUser ||
        targetUser.manager?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }
    }

    if (screenshotAccess === "own" && userId !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    let query = {
      user: userId,
    };

    if (date) {
      const start = new Date(date);
      const end = new Date(date);

      end.setDate(end.getDate() + 1);

      query.capturedAt = {
        $gte: start,
        $lt: end,
      };
    }

    const screenshots = await Screenshot.find(query)
      .sort({ capturedAt: -1 })
      .limit(3);

    res.status(200).json({
      success: true,
      screenshots,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// EXPORT ZIP
export const exportScreenshotsZip = async (req, res) => {
  try {
    const screenshots = await Screenshot.find().populate("user");

    res.setHeader("Content-Type", "application/zip");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=screenshots.zip",
    );

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    archive.on("error", (err) => {
      console.error("ARCHIVE ERROR:", err);
    });

    for (const shot of screenshots) {
      try {
        if (!shot.imageUrl) continue;

        const response = await axios.get(shot.imageUrl, {
          responseType: "stream",
        });

        const firstName = shot.user?.firstName || "Unknown";

        const lastName = shot.user?.lastName || "User";

        const fileName = `${firstName}_${lastName}/${shot._id}.png`;

        archive.append(response.data, {
          name: fileName,
        });
      } catch (err) {
        console.error("Failed screenshot:", shot._id);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Export failed",
    });
  }
};

import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import Activity from "../models/activity.model.js";
import AppClassification from "../models/appClassification.model.js";
import AppUsage from "../models/appUsage.model.js";
import Attendance from "../models/attendance.model.js";
import EmailChange from "../models/emailChange.model.js";
import Invite from "../models/invite.model.js";
import Organization from "../models/organization.model.js";
import Project from "../models/project.model.js";
import ProjectTracking from "../models/projectTracking.model.js";
import Report from "../models/report.model.js";
import Screenshot from "../models/screenshot.model.js";
import Session from "../models/session.model.js";
import Task from "../models/task.model.js";
import Team from "../models/team.model.js";
import Timer from "../models/timer.model.js";
import UsageLog from "../models/usageLog.model.js";
import User from "../models/user.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import path from "path";
import mongoose from "mongoose";
import { logAudit } from "../utils/logAudit.js";

export const getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    res.json({
      ...organization.toObject(),
      logo: getAvatarUrl(organization.logo),
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    // Delete previous logo
    if (organization.logo) {
      const oldLogoPath = path.join(process.cwd(), organization.logo);

      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    organization.logo = req.file.path.replace(/\\/g, "/");

    await organization.save();

    res.status(200).json({
      message: "Logo uploaded successfully",
      logo: `${process.env.BACKEND_URL}/${organization.logo}`,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to upload logo",
    });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const { name, timezone } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.user.organization,
      {
        name,
        timezone,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json(organization);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update organization",
    });
  }
};

export const deleteOrganization = async (req, res) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Only organization owner can delete organization",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const organizationId = req.user.organization;

    // Fetch organization before deleting
    const organization =
      await Organization.findById(organizationId).session(session);

    if (!organization) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Fetch users (keep avatars for filesystem cleanup)
    const usersWithAvatars = await User.find({
      organization: organizationId,
    })
      .select("_id avatar")
      .session(session);

    const userIds = usersWithAvatars.map((user) => user._id);

    // Fetch screenshot publicIds before deleting
    const screenshots = await Screenshot.find({
      user: { $in: userIds },
    })
      .select("publicId")
      .session(session);

    // -----------------------
    // USER RELATED DATA
    // -----------------------

    await Activity.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await AppUsage.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await AppClassification.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await Screenshot.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await Timer.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await UsageLog.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await Report.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await ProjectTracking.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await EmailChange.deleteMany({
      user: { $in: userIds },
    }).session(session);

    await Attendance.deleteMany({
      userId: { $in: userIds },
    }).session(session);

    await Session.deleteMany({
      userId: { $in: userIds },
    }).session(session);

    // -----------------------
    // ORGANIZATION DATA
    // -----------------------

    await Task.deleteMany({
      organization: organizationId,
    }).session(session);

    await Project.deleteMany({
      organization: organizationId,
    }).session(session);

    await Team.deleteMany({
      organization: organizationId,
    }).session(session);

    await Invite.deleteMany({
      organization: organizationId,
    }).session(session);

    // Clear refresh tokens
    await User.updateMany(
      {
        organization: organizationId,
      },
      {
        $set: {
          refreshToken: null,
        },
      },
      {
        session,
      },
    );

    // Delete users
    await User.deleteMany({
      organization: organizationId,
    }).session(session);

    // Delete organization
    await Organization.findByIdAndDelete(organizationId).session(session);

    // Commit database changes
    await session.commitTransaction();

    // -----------------------
    // CLEANUP FILES
    // -----------------------

    // Delete Cloudinary screenshots
    for (const shot of screenshots) {
      if (!shot.publicId) continue;

      try {
        await cloudinary.uploader.destroy(shot.publicId);
      } catch (err) {
        console.error(
          `Failed to delete Cloudinary screenshot: ${shot.publicId}`,
          err,
        );
      }
    }

    // Delete organization logo
    if (organization.logo) {
      const logoPath = path.join(process.cwd(), organization.logo);

      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    // Delete user avatars
    for (const user of usersWithAvatars) {
      if (!user.avatar) continue;

      const avatarPath = path.join(process.cwd(), user.avatar);

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Organization deleted successfully.",
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};

export const getTwoFactorSettings = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    res.status(200).json(organization.twoFactor);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch two factor settings",
    });
  }
};

export const updateTwoFactorSettings = async (req, res) => {
  try {
    const { role, enabled } = req.body;

    const allowedRoles = ["owner", "admin", "manager", "user"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    organization.twoFactor[role] = enabled;

    await organization.save();

    res.status(200).json({
      message: "Two factor settings updated successfully",
      twoFactor: organization.twoFactor,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update two factor settings",
    });
  }
};

export const getAppUpdateSettings = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.appUpdates) {
      organization.appUpdates = {
        automaticUpdates: true,
        forceUpdates: false,
        desktopReleaseEmails: false,
      };

      await organization.save();

      // await logAudit({
      //   organization: req.user.organization,
      //   performedBy: req.user._id,
      //   category: "Settings",
      //   activity: `Updated ${setting}`,
      //   details: {
      //     setting,
      //     enabled,
      //   },
      //   ipAddress: req.ip,
      //   platform: req.headers["user-agent"],
      // });
    }

    return res.status(200).json(organization.appUpdates);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch app update settings",
    });
  }
};

export const updateAppUpdateSettings = async (req, res) => {
  try {
    const { setting, enabled } = req.body;

    const allowedSettings = [
      "automaticUpdates",
      "forceUpdates",
      "desktopReleaseEmails",
    ];

    if (!allowedSettings.includes(setting)) {
      return res.status(400).json({
        message: "Invalid setting",
      });
    }

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.appUpdates) {
      organization.appUpdates = {
        automaticUpdates: true,
        forceUpdates: false,
        desktopReleaseEmails: false,
      };
    }

    organization.appUpdates[setting] = enabled;

    await organization.save();

    res.status(200).json({
      message: "App update settings updated successfully",
      appUpdates: organization.appUpdates,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update app update settings",
    });
  }
};

export const getEmailReportSettings = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.emailReports) {
      organization.emailReports = {
        weeklyTrackingReports: false,
        dailyTrackingReports: false,

        dailyWarningEmails: false,
        dailyBasedOnShift: true,
        dailyMinimumTime: {
          hours: 4,
          minutes: 0,
        },
        dailyWeekDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],

        weeklyWarningEmails: false,
        weeklyBasedOnShift: true,
        weeklyMinimumTime: {
          hours: 4,
          minutes: 0,
        },

        idlePercentageEnabled: false,
        idlePercentage: 30,
      };

      await organization.save();
    }

    return res.status(200).json(organization.emailReports);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch email report settings",
    });
  }
};

export const updateEmailReportSettings = async (req, res) => {
  try {
    const { setting, value } = req.body;

    const allowedSettings = [
      "weeklyTrackingReports",
      "dailyTrackingReports",

      "dailyWarningEmails",
      "dailyBasedOnShift",
      "dailyMinimumTime",
      "dailyWeekDays",

      "weeklyWarningEmails",
      "weeklyBasedOnShift",
      "weeklyMinimumTime",

      "idlePercentageEnabled",
      "idlePercentage",
    ];

    if (!allowedSettings.includes(setting)) {
      return res.status(400).json({
        message: "Invalid setting",
      });
    }

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.emailReports) {
      organization.emailReports = {
        weeklyTrackingReports: false,
        dailyTrackingReports: false,
        dailyWarningEmails: false,
        weeklyWarningEmails: false,
        idlePercentageEnabled: false,
        idlePercentage: 30,
      };
    }

    organization.emailReports[setting] = value;

    await organization.save();

    return res.status(200).json({
      message: "Email report settings updated successfully",
      emailReports: organization.emailReports,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to update email report settings",
    });
  }
};

export const getTaskManagementSettings = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.taskManagement) {
      organization.taskManagement = {
        notifyTaskAssignedEmail: true,
      };

      await organization.save();
    }

    return res.status(200).json(organization.taskManagement);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch task management settings",
    });
  }
};

export const updateTaskManagementSettings = async (req, res) => {
  try {
    const { setting, value } = req.body;

    const allowedSettings = ["notifyTaskAssignedEmail"];

    if (!allowedSettings.includes(setting)) {
      return res.status(400).json({
        message: "Invalid setting",
      });
    }

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    if (!organization.taskManagement) {
      organization.taskManagement = {
        notifyTaskAssignedEmail: true,
      };
    }

    organization.taskManagement[setting] = value;

    await organization.save();

    return res.status(200).json({
      message: "Task management settings updated successfully",
      taskManagement: organization.taskManagement,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to update task management settings",
    });
  }
};

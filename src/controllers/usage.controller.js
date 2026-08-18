import AppUsage from "../models/appUsage.model.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import UsageLog from "../models/usageLog.model.js";
import AppClassification from "../models/appClassification.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import { getReportUserIds } from "../utils/reportAccess.js";
import {
  getUserTimezone,
  getDateRangeUTC,
  getTodayInTimezone,
} from "../utils/timezone.js";

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

export const getTopApps = async (req, res) => {
  try {
    const { userId } = req.params;

    const allowedUserIds = await getReportUserIds(req.user);

    if (allowedUserIds && allowedUserIds.length === 0) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    if (
      allowedUserIds &&
      !allowedUserIds.some((id) => id.toString() === userId.toString())
    ) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    const { date } = req.query;

    const usages = await AppUsage.find({
      user: userId,
      date,
    });

    const COLORS = ["#36A2EB", "#64B8D1", "#4BC0C0", "#5B9BD5", "#FFCE56"];

    const apps = usages
      .map((usage, index) => ({
        name: usage.appName,
        value: usage.duration,
        duration: usage.duration,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.duration - a.duration);

    res.json(apps);
  } catch (err) {
    console.error("TOP APPS ERROR:", err);
    res.status(500).json({
      message: err.message,
    });
  }
};

export const trackAppUsage = async (req, res) => {
  try {
    const { appName, windowTitle, duration, project, task } = req.body;

    const normalizedAppName = appName?.trim().toLowerCase();

    const classification = await AppClassification.findOne({
      organization: req.user.organization,
      appName: normalizedAppName,
    });

    if (classification?.productivity === "blacklisted") {
      return res.json({
        success: true,
        skipped: true,
        reason: "blacklisted",
      });
    }

    if (classification) {
      const excludedUsers = (classification.excludedUsers || []).map((id) =>
        id.toString(),
      );

      if (excludedUsers.includes(req.user._id.toString())) {
        return res.json({
          success: true,
          skipped: true,
          reason: "excluded_user",
        });
      }

      const excludedTeams = (classification.excludedTeams || []).map((id) =>
        id.toString(),
      );

      if (req.user.team && excludedTeams.includes(req.user.team.toString())) {
        return res.json({
          success: true,
          skipped: true,
          reason: "excluded_team",
        });
      }
    }

    if (!normalizedAppName) {
      return res.status(400).json({
        message: "Application name is required",
      });
    }

    const user = await User.findById(req.user._id).select("reportTimezone");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const timezone = getUserTimezone(user);

    const date = getTodayInTimezone(timezone);

    const startTime = new Date();

    const endTime = new Date(startTime.getTime() + duration * 1000);

    let usage = await AppUsage.findOne({
      user: req.user._id,
      appName: normalizedAppName,
      date,
    });

    if (usage) {
      usage.duration += duration;
      usage.windowTitle = windowTitle;

      await usage.save();
    } else {
      usage = await AppUsage.create({
        user: req.user._id,
        appName: normalizedAppName,
        windowTitle,
        duration,
        date,
      });
    }

    await UsageLog.create({
      user: req.user._id,

      project: project || null,
      task: task || null,

      appName,

      windowTitle,

      startTime,

      endTime,

      duration,

      date,
    });

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getUsageData = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = "name", order = "asc" } = req.query;

    const userQuery = {
      organization: req.user.organization,
    };

    const allowedUserIds = await getReportUserIds(req.user);

    if (allowedUserIds && allowedUserIds.length === 0) {
      return res.json([]);
    }

    if (allowedUserIds) {
      userQuery._id = {
        $in: allowedUserIds,
      };
    }

    if (req.query.users?.trim()) {
      userQuery._id = {
        $in: req.query.users.split(",").filter(Boolean),
      };
    }

    if (req.query.teams?.trim()) {
      userQuery.team = {
        $in: req.query.teams.split(",").filter(Boolean),
      };
    }

    const users = await User.find(userQuery);

    const usageData = await Promise.all(
      users.map(async (user) => {
        const sessionQuery = {
          userId: user._id,
        };

        if (startDate && endDate) {
          const timezone = getUserTimezone(user);

          const { start, end } = getDateRangeUTC(startDate, endDate, timezone);

          sessionQuery.startTime = {
            $gte: start,
            $lte: end,
          };
        }

        const sessions = await Session.find(sessionQuery);

        const workSeconds = sessions
          .filter((s) => s.type === "work")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const breakSeconds = sessions
          .filter((s) => s.type === "break")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const query = {
          user: user._id,
        };

        if (startDate && endDate) {
          query.date = {
            $gte: startDate,
            $lte: endDate,
          };
        }

        const usages = await AppUsage.find(query);

        const appMap = {};

        usages.forEach((usage) => {
          if (!appMap[usage.appName]) {
            appMap[usage.appName] = 0;
          }

          appMap[usage.appName] += usage.duration;
        });

        const apps = Object.entries(appMap)
          .map(([name, duration]) => ({
            name,
            duration,
          }))
          .sort((a, b) => b.duration - a.duration);

        return {
          _id: user._id,

          firstName: user.firstName,

          lastName: user.lastName,

          avatar: getAvatarUrl(user.avatar),

          team: user.team || "Default team",

          name: `${user.firstName} ${user.lastName}`,

          workSeconds,
          breakSeconds,

          workTime: formatTime(workSeconds),
          breakTime: formatTime(breakSeconds),

          apps,
        };
      }),
    );

    usageData.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "workTime":
          comparison = a.workSeconds - b.workSeconds;
          break;

        case "breakTime":
          comparison = a.breakSeconds - b.breakSeconds;
          break;

        default:
          comparison = a.name.localeCompare(b.name);
      }

      return order === "asc" ? comparison : -comparison;
    });

    return res.json(usageData);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getUsageDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const allowedUserIds = await getReportUserIds(req.user);

    if (allowedUserIds && allowedUserIds.length === 0) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    if (
      allowedUserIds &&
      !allowedUserIds.some((id) => id.toString() === userId.toString())
    ) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    const { startDate, endDate } = req.query;

    const user = await User.findById(userId).select("reportTimezone");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const timezone = getUserTimezone(user);

    const query = {
      user: userId,
    };

    if (startDate && endDate) {
      const { start, end } = getDateRangeUTC(startDate, endDate, timezone);

      query.startTime = {
        $gte: start,
        $lte: end,
      };
    }

    const logs = await UsageLog.find(query).sort({
      startTime: 1,
    });

    const groupedLogs = [];

    for (const log of logs) {
      const lastLog = groupedLogs[groupedLogs.length - 1];

      if (!lastLog) {
        groupedLogs.push({
          ...log.toObject(),
        });

        continue;
      }

      if (
        lastLog.appName === log.appName &&
        lastLog.windowTitle === log.windowTitle
      ) {
        lastLog.endTime = log.endTime;

        lastLog.duration += log.duration;
      } else {
        groupedLogs.push({
          ...log.toObject(),
        });
      }
    }

    return res.json(groupedLogs.reverse());
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

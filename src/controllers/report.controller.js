import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import AppUsage from "../models/appUsage.model.js";
import AppClassification from "../models/appClassification.model.js";
import Project from "../models/project.model.js";
import ProjectTracking from "../models/projectTracking.model.js";
import { generateProductivityCSV } from "../services/reportExport.service.js";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { getAvatarUrl } from "../utils/avatar.js";
import { getReportUserIds } from "../utils/reportAccess.js";

const getScopedReportUserQuery = async (
  req,
  selectedUsers = [],
  selectedTeams = [],
) => {
  const allowedUserIds = await getReportUserIds(req.user);

  // No report access
  if (allowedUserIds && allowedUserIds.length === 0) {
    return null;
  }

  const userQuery = {
    organization: req.user.organization,
  };

  // Restrict to users allowed by reportAccess
  if (allowedUserIds) {
    userQuery._id = {
      $in: allowedUserIds,
    };
  }

  // Apply user's selected users without bypassing permissions
  if (selectedUsers?.length) {
    if (allowedUserIds) {
      userQuery._id = {
        $in: selectedUsers.filter((id) =>
          allowedUserIds.some(
            (allowedId) => allowedId.toString() === id.toString(),
          ),
        ),
      };
    } else {
      userQuery._id = {
        $in: selectedUsers,
      };
    }
  }

  // Apply selected teams
  if (selectedTeams?.length) {
    userQuery.team = {
      $in: selectedTeams,
    };
  }

  return userQuery;
};

import {
  generateAttendanceOverviewCSV,
  generateAttendanceDetailedCSV,
  generateProjectUserCSV,
  generateProjectCSV,
} from "../services/reportExport.service.js";

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

const formatClockTime = (date) => {
  if (!date) return null;

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const testCSV = async (req, res) => {
  try {
    const result = await generateAttendanceOverviewCSV("test123", [
      {
        name: "Rahul Yadav",
        workTime: "8h 30m",
        breakTime: "45m",
        startTime: "09:00 AM",
        finishTime: "06:00 PM",
        sessionsCount: 12,
      },
    ]);

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const createAttendanceOverviewReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const report = await Report.create({
      user: req.user._id,
      type: "attendance-overview",
      status: "processing",

      startDate,
      endDate,
    });

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    const users = await User.find(userQuery);

    const attendanceData = await Promise.all(
      users.map(async (user) => {
        const query = {
          userId: user._id,
        };

        if (startDate && endDate) {
          query.date = {
            $gte: startDate,
            $lte: endDate,
          };
        }

        const sessions = await Session.find(query);

        const sortedSessions = [...sessions].sort(
          (a, b) => new Date(a.startTime) - new Date(b.startTime),
        );

        const firstSession = sortedSessions[0];

        const lastSession = sortedSessions[sortedSessions.length - 1];

        const workSeconds = sessions
          .filter((s) => s.type === "work")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const breakSeconds = sessions
          .filter((s) => s.type === "break")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        return {
          name: `${user.firstName} ${user.lastName}`,

          workTime: formatTime(workSeconds),

          breakTime: formatTime(breakSeconds),

          startTime: firstSession
            ? formatClockTime(firstSession.startTime)
            : "",

          finishTime: lastSession ? formatClockTime(lastSession.endTime) : "",

          sessionsCount: sessions.length,
        };
      }),
    );

    const result = await generateAttendanceOverviewCSV(
      report._id,
      attendanceData,
    );

    report.status = "done";

    report.fileUrl = `/uploads/reports/${result.fileName}`;

    report.generatedAt = new Date();

    await report.save();

    res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    if (report.fileUrl) {
      const filePath = path.join(
        process.cwd(),
        report.fileUrl.replace(/^\//, ""),
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Report.findByIdAndDelete(report._id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const createAttendanceDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const report = await Report.create({
      user: req.user._id,
      type: "attendance-detailed",
      status: "processing",

      startDate,
      endDate,
    });

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    const users = await User.find(userQuery);

    const rows = [];

    for (const user of users) {
      const query = {
        userId: user._id,
      };

      if (startDate && endDate) {
        query.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const sessions = await Session.find(query).sort({
        startTime: 1,
      });

      const sessionsByDate = {};

      sessions.forEach((session) => {
        const date = session.date;

        if (!sessionsByDate[date]) {
          sessionsByDate[date] = [];
        }

        sessionsByDate[date].push(session);
      });

      for (const [date, daySessions] of Object.entries(sessionsByDate)) {
        const sortedSessions = [...daySessions].sort(
          (a, b) => new Date(a.startTime) - new Date(b.startTime),
        );

        const firstSession = sortedSessions[0];

        const lastSession = sortedSessions[sortedSessions.length - 1];

        const workSeconds = daySessions
          .filter((s) => s.type === "work")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const breakSeconds = daySessions
          .filter((s) => s.type === "break")
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        rows.push({
          name: `${user.firstName} ${user.lastName}`,

          date,

          startTime: firstSession?.startTime
            ? new Date(firstSession.startTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",

          finishTime: lastSession?.endTime
            ? new Date(lastSession.endTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",

          workTime: formatTime(workSeconds),

          breakTime: formatTime(breakSeconds),

          sessionsCount: daySessions.length,
        });
      }

      const result = await generateAttendanceDetailedCSV(report._id, rows);

      report.status = "done";

      report.fileUrl = result.fileUrl;

      report.generatedAt = new Date();

      await report.save();
    }

    res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const createUsageReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const report = await Report.create({
      user: req.user._id,

      type: "usage",

      status: "processing",

      startDate,
      endDate,
    });

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    const users = await User.find(userQuery);

    const csvRows = [];

    for (const user of users) {
      const query = {
        user: user._id,
      };

      if (startDate && endDate) {
        query.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const appUsages = await AppUsage.find(query);

      const totalTracked = appUsages.reduce(
        (sum, app) => sum + app.duration,
        0,
      );

      const apps = appUsages
        .sort((a, b) => b.duration - a.duration)
        .map((app) => `${app.appName} (${formatTime(app.duration)})`)
        .join(", ");

      csvRows.push({
        name: `${user.firstName} ${user.lastName}`,
        totalTracked: formatTime(totalTracked),
        apps,
      });
    }

    const result = await generateUsageCSV(report._id, csvRows);

    report.status = "done";

    report.fileUrl = result.fileUrl;

    report.generatedAt = new Date();

    await report.save();

    res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const generateUsageCSV = async (reportId, rows) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fields = ["Employee", "Total Tracked", "Applications"];

  const parser = new Parser({
    fields,
  });

  const csv = parser.parse(
    rows.map((row) => ({
      Employee: row.name,
      "Total Tracked": row.totalTracked,
      Applications: row.apps,
    })),
  );

  const fileName = `usage-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  fs.writeFileSync(filePath, csv);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};

export const createProductivityReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    const users = await User.find(userQuery);

    const report = await Report.create({
      user: req.user._id,
      type: "productivity",
      status: "processing",
      startDate,
      endDate,
    });

    const csvRows = [];

    const classifications = await AppClassification.find({
      organization: req.user.organization,
    });

    const classificationMap = {};

    classifications.forEach((item) => {
      classificationMap[item.appName.trim().toLowerCase()] = item.productivity;
    });

    for (const user of users) {
      const query = {
        user: user._id,
      };

      if (startDate && endDate) {
        query.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const appUsages = await AppUsage.find(query);

      let productiveSeconds = 0;
      let neutralSeconds = 0;
      let unproductiveSeconds = 0;

      for (const usage of appUsages) {
        const productivity =
          classificationMap[usage.appName?.trim().toLowerCase()] || "neutral";

        if (productivity === "productive") {
          productiveSeconds += usage.duration;
        } else if (productivity === "unproductive") {
          unproductiveSeconds += usage.duration;
        } else if (productivity !== "blacklisted") {
          neutralSeconds += usage.duration;
        }
      }

      const totalTracked =
        productiveSeconds + neutralSeconds + unproductiveSeconds;

      const productivePercent =
        totalTracked > 0
          ? Math.round((productiveSeconds / totalTracked) * 100)
          : 0;

      const neutralPercent =
        totalTracked > 0
          ? Math.round((neutralSeconds / totalTracked) * 100)
          : 0;

      const unproductivePercent =
        totalTracked > 0
          ? Math.round((unproductiveSeconds / totalTracked) * 100)
          : 0;

      csvRows.push({
        name: `${user.firstName} ${user.lastName}`,
        productiveTime: formatTime(productiveSeconds),
        neutralTime: formatTime(neutralSeconds),
        unproductiveTime: formatTime(unproductiveSeconds),
        totalTracked: formatTime(totalTracked),
        productivePercent: `${productivePercent}%`,
        neutralPercent: `${neutralPercent}%`,
        unproductivePercent: `${unproductivePercent}%`,
      });
    }

    const result = await generateProductivityCSV(report._id, csvRows);

    report.status = "done";
    report.fileUrl = result.fileUrl;
    report.generatedAt = new Date();

    await report.save();

    return res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const getProductivityReport = async (req, res) => {
  try {
    const selectedUsers = req.query.users?.trim()
      ? req.query.users.split(",").filter(Boolean)
      : [];

    const selectedTeams = req.query.teams?.trim()
      ? req.query.teams.split(",").filter(Boolean)
      : [];

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.json([]);
    }

    const users = await User.find(userQuery).populate("team");

    const data = await Promise.all(
      users.map(async (user) => {
        const query = {
          userId: user._id,
        };

        if (req.query.startDate && req.query.endDate) {
          query.date = {
            $gte: req.query.startDate,
            $lte: req.query.endDate,
          };
        }

        const sessions = await Session.find(query);

        const totalSeconds = sessions
          .filter((session) => session.type === "work")
          .reduce((sum, session) => sum + (session.duration || 0), 0);

        const appUsageQuery = {
          user: user._id,
        };

        if (req.query.startDate && req.query.endDate) {
          const startDate = req.query.startDate.split("T")[0];
          const endDate = req.query.endDate.split("T")[0];

          appUsageQuery.date = {
            $gte: startDate,
            $lte: endDate,
          };
        }

        const appUsages = await AppUsage.find(appUsageQuery);

        if (appUsages.length) {
        }

        const classifications = await AppClassification.find({
          organization: req.user.organization,
        });

        const classificationMap = {};

        classifications.forEach((item) => {
          classificationMap[item.appName.trim().toLowerCase()] = item;
        });

        const productiveApps = {};
        const neutralApps = {};
        const unproductiveApps = {};

        appUsages.forEach((app) => {
          const appKey = app.appName?.trim().toLowerCase();

          const classification = classificationMap[appKey];

          const productivity = classification?.productivity || "neutral";

          if (productivity === "blacklisted") {
            return;
          }

          if (classification) {
            const excludedUsers = (classification.excludedUsers || []).map(
              (id) => id.toString(),
            );

            if (excludedUsers.includes(user._id.toString())) {
              return;
            }

            if (classification) {
              const excludedTeams = (classification.excludedTeams || []).map(
                (id) => id.toString(),
              );

              if (
                user.team &&
                excludedTeams.includes(user.team._id.toString())
              ) {
                return;
              }
            }
          }

          let target;

          if (productivity === "productive") {
            target = productiveApps;
          } else if (productivity === "unproductive") {
            target = unproductiveApps;
          } else {
            target = neutralApps;
          }

          if (!target[app.appName]) {
            target[app.appName] = 0;
          }

          target[app.appName] += app.duration;
        });

        const productiveSeconds = Object.values(productiveApps).reduce(
          (sum, duration) => sum + duration,
          0,
        );

        const neutralSeconds = Object.values(neutralApps).reduce(
          (sum, duration) => sum + duration,
          0,
        );

        const unproductiveSeconds = Object.values(unproductiveApps).reduce(
          (sum, duration) => sum + duration,
          0,
        );

        const totalTrackedSeconds =
          productiveSeconds + neutralSeconds + unproductiveSeconds;

        const productivePercent =
          totalTrackedSeconds > 0
            ? Math.round((productiveSeconds / totalTrackedSeconds) * 100)
            : 0;

        const neutralPercent =
          totalTrackedSeconds > 0
            ? Math.round((neutralSeconds / totalTrackedSeconds) * 100)
            : 0;

        const unproductivePercent =
          totalTrackedSeconds > 0
            ? Math.round((unproductiveSeconds / totalTrackedSeconds) * 100)
            : 0;

        return {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          avatar: getAvatarUrl(user.avatar),

          totalTracked: formatTime(totalSeconds),

          productivePercent,
          neutralPercent,
          unproductivePercent,

          productiveTime: formatTime(productiveSeconds),

          neutralTime: formatTime(neutralSeconds),

          unproductiveTime: formatTime(unproductiveSeconds),

          productiveApps: Object.entries(productiveApps)
            .sort((a, b) => b[1] - a[1])
            .map(([name, duration]) => ({
              name,
              duration,
              time: formatTime(duration),
            })),

          neutralApps: Object.entries(neutralApps)
            .sort((a, b) => b[1] - a[1])
            .map(([name, duration]) => ({
              name,
              duration,
              time: formatTime(duration),
            })),

          unproductiveApps: Object.entries(unproductiveApps)
            .sort((a, b) => b[1] - a[1])
            .map(([name, duration]) => ({
              name,
              duration,
              time: formatTime(duration),
            })),
        };
      }),
    );

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const createProjectUserReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const report = await Report.create({
      user: req.user._id,
      type: "project-user",
      status: "processing",
      startDate,
      endDate,
    });

    const userQuery = await getScopedReportUserQuery(
      req,
      selectedUsers,
      selectedTeams,
    );

    if (!userQuery) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    const users = await User.find(userQuery).select("_id firstName lastName");

    const userIds = users.map((user) => user._id);

    const trackingQuery = {
      user: {
        $in: userIds,
      },
    };

    if (startDate && endDate) {
      trackingQuery.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const tracking = await ProjectTracking.find(trackingQuery)
      .populate("user", "firstName lastName")
      .populate("project", "name")
      .populate("task", "title")
      .sort({ date: 1 });

    const rows = tracking.map((item) => ({
      user: item.user ? `${item.user.firstName} ${item.user.lastName}` : "",
      project: item.project?.name || "",
      task: item.task?.title || "",
      date: item.date || "",
      duration: formatTime(item.duration || 0),
    }));

    const result = await generateProjectUserCSV(report._id, rows);

    report.status = "done";
    report.fileUrl = result.fileUrl;
    report.generatedAt = new Date();

    await report.save();

    return res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const createProjectReport = async (req, res) => {
  try {
    const { startDate, endDate, selectedUsers, selectedTeams } = req.body;

    const allowedUserIds = await getReportUserIds(req.user);

    if (allowedUserIds && allowedUserIds.length === 0) {
      return res.status(403).json({
        message: "Report access denied",
      });
    }

    let scopedUserIds = null;

    if (selectedUsers?.length) {
      scopedUserIds = allowedUserIds
        ? selectedUsers.filter((id) =>
            allowedUserIds.some(
              (allowedId) => allowedId.toString() === id.toString(),
            ),
          )
        : selectedUsers;
    } else if (allowedUserIds) {
      scopedUserIds = allowedUserIds.map((id) => id.toString());
    }

    const projectQuery = {
      organization: req.user.organization,
    };

    if (selectedTeams?.length) {
      projectQuery.teams = {
        $in: selectedTeams,
      };
    }

    if (scopedUserIds) {
      projectQuery.users = {
        $in: scopedUserIds,
      };
    }

    const projects = await Project.find(projectQuery).populate(
      "users",
      "firstName lastName email",
    );

    const report = await Report.create({
      user: req.user._id,
      type: "project",
      status: "processing",
      startDate,
      endDate,
    });

    const rows = [];

    for (const project of projects) {
      const trackingQuery = {
        project: project._id,
      };

      if (scopedUserIds) {
        trackingQuery.user = {
          $in: scopedUserIds,
        };
      }

      if (startDate && endDate) {
        trackingQuery.date = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const records = await ProjectTracking.find(trackingQuery);

      if (!records.length) {
        continue;
      }

      const totalSeconds = records.reduce(
        (sum, record) => sum + (record.duration || 0),
        0,
      );

      const visibleUsers = allowedUserIds
        ? project.users.filter((user) =>
            allowedUserIds.some(
              (allowedId) => allowedId.toString() === user._id.toString(),
            ),
          )
        : project.users;

      const users = visibleUsers
        .map((user) => `${user.firstName} ${user.lastName}`)
        .join(", ");

      rows.push({
        project: project.name,
        users,
        totalDuration: formatTime(totalSeconds),
      });
    }

    const result = await generateProjectCSV(report._id, rows);

    report.status = "done";
    report.fileUrl = result.fileUrl;
    report.generatedAt = new Date();

    await report.save();

    return res.status(201).json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const classifyApp = async (req, res) => {
  try {
    const { appName, productivity } = req.body;

    if (!appName || !productivity) {
      return res.status(400).json({
        message: "App name and productivity are required",
      });
    }

    const normalizedAppName = appName.trim().toLowerCase();

    const classification = await AppClassification.findOneAndUpdate(
      {
        organization: req.user.organization,
        appName: normalizedAppName,
      },
      {
        productivity,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      success: true,
      classification,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

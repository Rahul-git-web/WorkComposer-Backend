import mongoose from "mongoose";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import Screenshot from "../models/screenshot.model.js";
import Task from "../models/task.model.js";
import ProjectTracking from "../models/projectTracking.model.js";
import Activity from "../models/activity.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import { checkSessionOverlap } from "../utils/session.js";
import { getUserTimezone, getDateRangeUTC } from "../utils/timezone.js";
import { getReportUserIds } from "../utils/reportAccess.js";
import Report from "../models/report.model.js";
import { generateTimeTrackingCSV } from "../services/reportExport.service.js";

const updateSessionScreenshotCount = async (session) => {
  const count = await Screenshot.countDocuments({
    userId: session.userId,
    capturedAt: {
      $gte: session.startTime,
      $lte: session.endTime,
    },
  });

  session.screenshots = count;

  await session.save();
};

//Create Session
export const createSession = async (req, res) => {
  try {
    const { startTime, endTime, duration, type } = req.body;

    if (!startTime || !endTime || !duration) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const existingSession = await checkSessionOverlap(
      req.user._id,
      startTime,
      endTime,
    );

    if (existingSession) {
      return res.status(400).json({
        message: "Time range overlaps with existing session",
      });
    }

    const session = await Session.create({
      userId: req.user._id,
      startTime,
      endTime,
      duration,
      type,
      date: new Date(startTime).toISOString().split("T")[0],
    });

    res.status(201).json(session);
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

//Get Sessions By Date
export const getSessions = async (req, res) => {
  try {
    const { date } = req.query;

    let query = {
      userId: req.user._id,
    };

    if (date) {
      query.date = date;
    }

    const sessions = await Session.find(query);

    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// DELETE SESSIONS IN RANGE
export const deleteSessionsInRange = async (req, res) => {
  let mongoSession;

  try {
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return res.status(403).json({
        error: "You don't have permission to remove tracked time.",
      });
    }

    const { startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    //  Validation
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start and End time required" });
    }

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    mongoSession = await mongoose.startSession();
    await mongoSession.startTransaction();

    //  Find ALL overlapping sessions
    const sessions = await Session.find({
      userId: req.user._id,
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).session(mongoSession);

    const reportRows = sessions.map((session) => ({
      employee: `${req.user.firstName} ${req.user.lastName}`,
      date:
        session.date || new Date(session.startTime).toISOString().split("T")[0],
      startTime: new Date(session.startTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      endTime: new Date(session.endTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      duration: `${Math.floor((session.duration || 0) / 3600)}h ${Math.floor(
        ((session.duration || 0) % 3600) / 60,
      )}m`,
      type: session.type,
      project: "",
      task: "",
      reason: "Removed tracked time",
    }));

    let workTime = 0;
    let breakTime = 0;
    let deletedCount = 0;
    let modifiedCount = 0;
    let screenshots = 0;

    for (const s of sessions) {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);

      // Overlap calculation
      const overlapStart = new Date(Math.max(sStart, start));
      const overlapEnd = new Date(Math.min(sEnd, end));

      const overlapSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000),
      );

      if (s.type === "work") workTime += overlapSeconds;
      if (s.type === "break") breakTime += overlapSeconds;

      screenshots += s.screenshots || 0;

      // -----------------------------
      // CASE 1: Fully inside → delete
      // -----------------------------
      if (sStart >= start && sEnd <= end) {
        await Session.deleteOne({ _id: s._id }).session(mongoSession);
        deletedCount++;
      }

      // -----------------------------
      // CASE 2: Cut right side
      // -----------------------------
      else if (sStart < start && sEnd > start && sEnd <= end) {
        s.endTime = start;
        s.duration = Math.floor((start - sStart) / 1000);

        await s.save({ session: mongoSession });

        await updateSessionScreenshotCount(s);

        modifiedCount++;
      }

      // -----------------------------
      // CASE 3: Cut left side
      // -----------------------------
      else if (sStart >= start && sStart < end && sEnd > end) {
        s.startTime = end;
        s.duration = Math.floor((sEnd - end) / 1000);

        await s.save({ session: mongoSession });

        await updateSessionScreenshotCount(s);

        modifiedCount++;
      }

      // -----------------------------
      // CASE 4: Split into two
      // -----------------------------
      else if (sStart < start && sEnd > end) {
        const firstPart = {
          userId: s.userId,
          startTime: sStart,
          endTime: start,
          duration: Math.floor((start - sStart) / 1000),
          type: s.type,
          team: s.team,
          source: s.source,
          date: new Date(sStart).toISOString().split("T")[0],
        };

        const secondPart = {
          userId: s.userId,
          startTime: end,
          endTime: sEnd,
          duration: Math.floor((sEnd - end) / 1000),
          type: s.type,
          team: s.team,
          source: s.source,
          date: new Date(end).toISOString().split("T")[0],
        };

        await Session.deleteOne({ _id: s._id }).session(mongoSession);

        const [newFirstSession] = await Session.create([firstPart], {
          session: mongoSession,
        });

        const [newSecondSession] = await Session.create([secondPart], {
          session: mongoSession,
        });

        await updateSessionScreenshotCount(newFirstSession);
        await updateSessionScreenshotCount(newSecondSession);

        deletedCount++;
      }
    }

    await Screenshot.deleteMany({
      user: req.user._id,
      capturedAt: {
        $gte: start,
        $lte: end,
      },
    }).session(mongoSession);

    const report = await Report.create(
      [
        {
          user: req.user._id,
          type: "removed-time",
          status: "processing",
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        },
      ],
      {
        session: mongoSession,
      },
    );

    const generatedReport = await generateTimeTrackingCSV(
      report[0]._id,
      reportRows,
      "removed-time",
    );

    report[0].status = "done";
    report[0].fileUrl = generatedReport.fileUrl;
    report[0].generatedAt = new Date();

    await report[0].save({
      session: mongoSession,
    });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return res.json({
      message: "Deleted successfully",
      deletedCount,
      modifiedCount,
      workTime,
      breakTime,
      screenshots,
      report: {
        type: "removed-time",
        fileUrl: report[0].fileUrl,
        reportId: report[0]._id,
      },
    });
  } catch (err) {
    if (mongoSession) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
    }

    return res.status(500).json({
      error: err.message,
    });
  }
};

// PREVIEW SESSIONS IN RANGE
export const previewSessionsInRange = async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    // Validation
    if (!startTime || !endTime) {
      return res.status(400).json({
        error: "Start time and end time are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        error: "Invalid date format",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: "Start time must be before end time",
      });
    }

    // Same logic as delete (IMPORTANT)
    const sessions = await Session.find({
      userId: req.user._id,
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).lean();

    let workTime = 0;
    let breakTime = 0;
    let screenshots = 0;

    sessions.forEach((s) => {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);

      const overlapStart = new Date(Math.max(sStart, start));
      const overlapEnd = new Date(Math.min(sEnd, end));

      const overlapSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000),
      );

      if (s.type === "work") workTime += overlapSeconds;
      if (s.type === "break") breakTime += overlapSeconds;

      screenshots += s.screenshots || 0;
    });

    return res.status(200).json({
      workTime,
      breakTime,
      screenshots,
      sessionsCount: sessions.length,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

const formatTime = (seconds) => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");

  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");

  return `${h}:${m}`;
};

const calculateMergedDuration = (sessions) => {
  if (!sessions.length) return 0;

  const intervals = sessions
    .map((s) => ({
      start: new Date(s.startTime).getTime(),
      end: new Date(s.endTime).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  const merged = [];

  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];

    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);

  return merged.reduce(
    (total, interval) =>
      total + Math.floor((interval.end - interval.start) / 1000),
    0,
  );
};

export const getOverviewData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const allowedUserIds = await getReportUserIds(req.user);

    if (allowedUserIds && allowedUserIds.length === 0) {
      return res.json([]);
    }

    const userQuery = {
      organization: req.user.organization,
    };

    if (allowedUserIds) {
      userQuery._id = {
        $in: allowedUserIds,
      };
    }

    const users = await User.find(userQuery).select("-password");

    const overview = await Promise.all(
      users.map(async (user) => {
        const query = {
          userId: user._id,
        };

        if (startDate && endDate) {
          const timezone = getUserTimezone(user);

          const { start, end } = getDateRangeUTC(startDate, endDate, timezone);

          query.startTime = {
            $gte: start,
            $lte: end,
          };
        }

        const sessions = await Session.find(query);

        const workSeconds = calculateMergedDuration(
          sessions.filter((s) => s.type === "work"),
        );

        const breakSeconds = calculateMergedDuration(
          sessions.filter((s) => s.type === "break"),
        );

        const lastSession = sessions.sort(
          (a, b) => new Date(b.endTime) - new Date(a.endTime),
        )[0];

        return {
          id: user._id,
          date: startDate,
          name: `${user.firstName} ${user.lastName}`,

          avatar: getAvatarUrl(user.avatar),

          team: user.team || "Default team",

          workTime: formatTime(workSeconds),

          breakTime: formatTime(breakSeconds),

          status: user.devices?.some(
            (device) => device.isOnline === true && device.isTracking === true,
          )
            ? "Tracking running"
            : "Tracking stopped",

          lastSync: lastSession
            ? new Date(lastSession.endTime).toLocaleString()
            : "--",
        };
      }),
    );

    res.json(overview);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

export const getTodaySummary = async (req, res) => {
  try {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const sessions = await Session.find({
      userId: req.user._id,
      startTime: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    });

    const workSeconds = calculateMergedDuration(
      sessions.filter((s) => s.type === "work"),
    );

    const breakSeconds = calculateMergedDuration(
      sessions.filter((s) => s.type === "break"),
    );

    res.json({
      workSeconds,
      breakSeconds,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

export const getWorkTimeStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();

    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sessions = await Session.find({
      userId,
      type: "work",
    });

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;

    sessions.forEach((session) => {
      const start = new Date(session.startTime);

      if (start >= todayStart) {
        todaySeconds += session.duration;
      }

      if (start >= weekStart) {
        weekSeconds += session.duration;
      }

      if (start >= monthStart) {
        monthSeconds += session.duration;
      }
    });

    const workedDays = new Set();

    sessions.forEach((session) => {
      workedDays.add(new Date(session.startTime).toDateString());
    });

    const avgDaySeconds =
      workedDays.size > 0 ? Math.floor(monthSeconds / workedDays.size) : 0;

    res.json({
      todaySeconds,
      weekSeconds,
      monthSeconds,
      avgDaySeconds,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getTodayChartData = async (req, res) => {
  try {
    const userId = req.user._id;

    const hours = [];

    for (let i = 0; i < 24; i++) {
      const hour = i % 12 || 12;
      const period = i < 12 ? "AM" : "PM";

      hours.push({
        time: `${hour} ${period}`,
        work: 0,
        break: 0,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const sessions = await Session.find({
      userId,
      startTime: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    });

    sessions.forEach((session) => {
      let current = new Date(session.startTime);
      const end = new Date(session.endTime);

      while (current < end) {
        const nextHour = new Date(current);

        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);

        const chunkEnd = nextHour < end ? nextHour : end;

        const seconds = (chunkEnd - current) / 1000;

        const hourIndex = current.getHours();

        if (session.type === "work") {
          hours[hourIndex].work += seconds / 3600;
        } else {
          hours[hourIndex].break += seconds / 3600;
        }

        current = chunkEnd;
      }
    });

    hours.forEach((hour) => {
      hour.work = Number(hour.work.toFixed(2));
      hour.break = Number(hour.break.toFixed(2));
    });

    return res.json(hours);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getLast30DaysChart = async (req, res) => {
  try {
    const userId = req.user._id;

    const days = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();

      date.setDate(date.getDate() - i);

      days.push({
        day: date.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        }),
        work: 0,
        break: 0,
        date: date.toISOString().split("T")[0],
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      userId,
      startTime: {
        $gte: startDate,
      },
    });

    sessions.forEach((session) => {
      const sessionDate = new Date(session.startTime)
        .toISOString()
        .split("T")[0];

      const day = days.find((d) => d.date === sessionDate);

      if (!day) return;

      if (session.type === "work") {
        day.work += session.duration / 3600;
      } else {
        day.break += session.duration / 3600;
      }
    });

    days.forEach((day) => {
      day.work = Number(day.work.toFixed(2));
      day.break = Number(day.break.toFixed(2));

      delete day.date;
    });

    return res.json(days);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getTodayTaskSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const today = new Date().toISOString().split("T")[0];

    // 1. Tasks assigned to the user
    const assignedTasks = await Task.countDocuments({
      assignedTo: userId,
      organization: req.user.organization,
    });

    // 2. Task tracking for today
    const taskTracking = await ProjectTracking.find({
      user: userId,
      date: today,
      task: { $ne: null },
    });

    // 3. Distinct tasks actually worked on today
    const workedTaskIds = new Set(
      taskTracking.map((tracking) => tracking.task.toString()),
    );

    // 4. Total time spent specifically on tasks
    const taskWorkSeconds = taskTracking.reduce(
      (total, tracking) => total + (tracking.duration || 0),
      0,
    );

    // 5. Break time today
    const breakSessions = await Session.find({
      userId,
      date: today,
      type: "break",
    });

    const breakSeconds = breakSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0,
    );

    // 6. Activity belonging specifically to tasks
    const taskActivities = await Activity.find({
      user: userId,
      date: today,
      task: { $ne: null },
    });

    const totalActions = taskActivities.reduce(
      (total, activity) =>
        total +
        (activity.keyPresses || 0) +
        (activity.mouseClicks || 0) +
        (activity.mouseMoves || 0),
      0,
    );

    const averageActions =
      taskActivities.length > 0 ? totalActions / taskActivities.length : 0;

    const activityPercent = Math.min(
      Math.round((averageActions / 50) * 100),
      100,
    );

    return res.json({
      assignedTasks,
      workedTasks: workedTaskIds.size,
      taskWorkSeconds,
      breakSeconds,
      activityPercent,
    });
  } catch (err) {
    console.error("GET TODAY TASK SUMMARY ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

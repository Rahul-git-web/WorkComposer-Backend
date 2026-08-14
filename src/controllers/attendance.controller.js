import Attendance from "../models/attendance.model.js";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import {
  getUserTimezone,
  getDateRangeUTC,
  getDateInTimezone,
  getTodayInTimezone,
} from "../utils/timezone.js";

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

export const getAttendanceData = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = "name", order = "asc" } = req.query;

    const userQuery = {
      organization: req.user.organization,
    };

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

    const attendance = await Promise.all(
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

        const sortedSessions = [...sessions].sort(
          (a, b) => new Date(a.startTime) - new Date(b.startTime),
        );

        const firstSession = sortedSessions[0];

        const lastSession = sortedSessions[sortedSessions.length - 1];

        const workSeconds = sessions
          .filter((s) => s.type === "work")
          .reduce((sum, s) => sum + s.duration, 0);

        const breakSeconds = sessions
          .filter((s) => s.type === "break")
          .reduce((sum, s) => sum + s.duration, 0);

        const dailyData = {};

        if (startDate && endDate) {
          const timezone = getUserTimezone(user);

          const startParts = startDate.split("-").map(Number);
          const endParts = endDate.split("-").map(Number);

          let currentDate = new Date(
            Date.UTC(startParts[0], startParts[1] - 1, startParts[2]),
          );

          const finalDate = new Date(
            Date.UTC(endParts[0], endParts[1] - 1, endParts[2]),
          );

          while (currentDate <= finalDate) {
            const dateKey = currentDate.toISOString().split("T")[0];

            dailyData[dateKey] = {
              date: dateKey,
              workSeconds: 0,
              breakSeconds: 0,
              sessions: [],
            };

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          }
        }

        sessions.forEach((session) => {
          const date = session.date;

          if (!dailyData[date]) {
            dailyData[date] = {
              date,
              workSeconds: 0,
              breakSeconds: 0,
              sessions: [],
            };
          }

          if (session.type === "work") {
            dailyData[date].workSeconds += session.duration;
          }

          if (session.type === "break") {
            dailyData[date].breakSeconds += session.duration;
          }

          dailyData[date].sessions.push(session);
        });

        const dailyDataArray = Object.values(dailyData).map((day) => ({
          date: day.date,
          workTime: formatTime(day.workSeconds),
          breakTime: formatTime(day.breakSeconds),
          sessions: day.sessions,
        }));

        return {
          _id: user._id,

          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: getAvatarUrl(user.avatar),

          isTracking: user.devices?.some((device) => device.isOnline) ?? false,

          team: user.team || "Default team",

          name: `${user.firstName} ${user.lastName}`,

          workSeconds,

          breakSeconds,

          workTime: formatTime(workSeconds),

          breakTime: formatTime(breakSeconds),

          startTime: firstSession
            ? formatClockTime(firstSession.startTime)
            : null,

          finishTime: lastSession ? formatClockTime(lastSession.endTime) : null,

          sessionsCount: sessions.length,

          sessions,

          dailyData: dailyDataArray,
        };
      }),
    );

    attendance.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "team":
          comparison = a.team.localeCompare(b.team);
          break;

        case "workTime":
          comparison = a.workSeconds - b.workSeconds;
          break;

        case "breakTime":
          comparison = a.breakSeconds - b.breakSeconds;
          break;

        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return order === "asc" ? comparison : -comparison;
    });

    return res.json(attendance);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUserAttendanceSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const timezone = getUserTimezone(user);
    const today = getTodayInTimezone(timezone);

    const { start, end } = getDateRangeUTC(today, today, timezone);

    const sessions = await Session.find({
      userId,
      startTime: {
        $gte: start,
        $lte: end,
      },
    });

    const workSeconds = sessions
      .filter((s) => s.type === "work")
      .reduce((sum, s) => sum + s.duration, 0);

    const breakSeconds = sessions
      .filter((s) => s.type === "break")
      .reduce((sum, s) => sum + s.duration, 0);

    res.json({
      workSeconds,
      breakSeconds,
      workTime: formatTime(workSeconds),
      breakTime: formatTime(breakSeconds),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const finishAttendance = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const timezone = getUserTimezone(user);

    const now = new Date();
    const today = getTodayInTimezone(timezone);

    const { start, end } = getDateRangeUTC(today, today, timezone);

    const sessions = await Session.find({
      userId,
      date: today,
    });

    const workSeconds = sessions
      .filter((session) => session.type === "work")
      .reduce((sum, session) => sum + (session.duration || 0), 0);

    const breakSeconds = sessions
      .filter((session) => session.type === "break")
      .reduce((sum, session) => sum + (session.duration || 0), 0);

    const firstSession = [...sessions].sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime),
    )[0];

    const attendance = await Attendance.findOneAndUpdate(
      {
        user: userId,
        date: {
          $gte: start,
          $lte: end,
        },
      },
      {
        $set: {
          user: userId,
          organization: req.user.organization,
          date: firstSession?.startTime || now,
          workTime: workSeconds,
          breakTime: breakSeconds,
          startTime: firstSession?.startTime || null,
          finishTime: now,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    return res.json({
      success: true,
      message: "Workday finished successfully",
      attendance,
    });
  } catch (err) {
    console.error("FINISH ATTENDANCE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

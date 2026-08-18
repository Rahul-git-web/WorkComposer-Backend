import Session from "../models/session.model.js";
import Screenshot from "../models/screenshot.model.js";
import Activity from "../models/activity.model.js";
import UsageLog from "../models/usageLog.model.js";
import AppClassification from "../models/appClassification.model.js";
import { getReportUserIds } from "../utils/reportAccess.js";

export const getActivity = async (req, res) => {
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

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const screenshots = await Screenshot.find({
      user: userId,
      capturedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ capturedAt: 1 });

    const buckets = {};

    screenshots.forEach((shot) => {
      const date = new Date(shot.capturedAt);

      const hour = date.getHours();

      const minute = date.getMinutes();

      const bucketMinute = minute < 30 ? "00" : "30";

      const bucketKey = `${hour}:${bucketMinute}`;

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          total: 0,
          count: 0,
          workTime: 0,
        };
      }

      buckets[bucketKey].total += shot.activityScore || 0;
      buckets[bucketKey].count += 1;
      buckets[bucketKey].workTime += 5;
    });

    const activity = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const bucketKey = `${hour}:${minute === 0 ? "00" : "30"}`;

        const bucket = buckets[bucketKey];

        let avgScore = 0;

        if (bucket) {
          avgScore = Math.round(bucket.total / bucket.count);
        }

        let color = "#22C55E";

        if (avgScore < 40) {
          color = "#EF4444";
        } else if (avgScore < 70) {
          color = "#F59E0B";
        }

        activity.push({
          time: bucketKey,
          value: avgScore,
          workTime: bucket?.workTime || 0,
          color: "#6366F1",
        });
      }
    }

    const activeBuckets = activity.filter((item) => item.value > 0);

    const averageScore =
      activeBuckets.reduce((sum, item) => sum + item.value, 0) /
      (activeBuckets.length || 1);

    const activityScore = Math.round(averageScore);

    const idleTime = 100 - activityScore;

    return res.json({
      activity,
      activityScore,
      idleTime,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

export const getActivityTimeline = async (req, res) => {
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

    const sessions = await Session.find({
      userId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const timelineMap = {};

    sessions.forEach((session) => {
      const day = session.date;

      if (!timelineMap[day]) {
        timelineMap[day] = {
          workSeconds: 0,
          breakSeconds: 0,
        };
      }

      if (session.type === "break") {
        timelineMap[day].breakSeconds += session.duration || 0;
      } else {
        timelineMap[day].workSeconds += session.duration || 0;
      }
    });

    const formatTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);

      return `${h}h ${m}m`;
    };

    const timeline = [];

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateKey = current.toISOString().split("T")[0];

      const dayData = timelineMap[dateKey] || {
        workSeconds: 0,
        breakSeconds: 0,
      };

      timeline.push({
        date: current.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        workTime: formatTime(dayData.workSeconds),
        breakTime: formatTime(dayData.breakSeconds),
      });

      current.setDate(current.getDate() + 1);
    }

    return res.json(timeline);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const trackActivity = async (req, res) => {
  try {
    const { keyPresses, mouseClicks, mouseMoves, project, task } = req.body;

    const date = new Date().toISOString().split("T")[0];

    const activity = await Activity.create({
      user: req.user._id,

      project: project || null,
      task: task || null,

      date,
      keyPresses,
      mouseClicks,
      mouseMoves,
    });

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

export const getSessionDetails = async (req, res) => {
  try {
    const { userId, startTime, endTime } = req.query;

    const start = new Date(startTime);
    const end = new Date(endTime);

    const durationSeconds = Math.floor((end - start) / 1000);

    const hours = Math.floor(durationSeconds / 3600);

    const minutes = Math.floor((durationSeconds % 3600) / 60);

    const workTime = `${hours}h ${minutes}m`;

    const activities = await Activity.find({}).sort({ createdAt: -1 }).limit(5);

    const activitiesInRange = await Activity.find({
      user: userId,
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }).sort({ createdAt: 1 });

    if (!userId || !startTime || !endTime) {
      return res.status(400).json({
        message: "Missing required params",
      });
    }

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

    const screenshots = await Screenshot.find({
      user: userId,
      capturedAt: {
        $gte: start,
        $lte: end,
      },
    }).sort({ capturedAt: 1 });

    const usageLogs = await UsageLog.find({
      user: userId,
      startTime: {
        $lt: end,
      },
      endTime: {
        $gt: start,
      },
    });

    const classifications = await AppClassification.find({
      organization: req.user.organization,
    });

    const classificationMap = {};

    classifications.forEach((item) => {
      classificationMap[item.appName] = item.productivity;
    });

    let productiveSeconds = 0;
    let neutralSeconds = 0;
    let unproductiveSeconds = 0;

    for (const log of usageLogs) {
      const overlapStart = new Date(Math.max(new Date(log.startTime), start));

      const overlapEnd = new Date(Math.min(new Date(log.endTime), end));

      const overlapSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000),
      );

      const productivity = classificationMap[log.appName] || "neutral";

      if (productivity === "productive") {
        productiveSeconds += overlapSeconds;
      } else if (productivity === "unproductive") {
        unproductiveSeconds += overlapSeconds;
      } else {
        neutralSeconds += overlapSeconds;
      }
    }

    const totalTracked =
      productiveSeconds + neutralSeconds + unproductiveSeconds;

    const productivePercent =
      totalTracked > 0
        ? Math.round((productiveSeconds / totalTracked) * 100)
        : 0;

    const neutralPercent =
      totalTracked > 0 ? Math.round((neutralSeconds / totalTracked) * 100) : 0;

    const unproductivePercent =
      totalTracked > 0
        ? Math.round((unproductiveSeconds / totalTracked) * 100)
        : 0;

    const totalActions = activitiesInRange.reduce(
      (sum, activity) =>
        sum +
        (activity.keyPresses || 0) +
        (activity.mouseClicks || 0) +
        (activity.mouseMoves || 0),
      0,
    );

    const averageActions =
      activitiesInRange.length > 0
        ? totalActions / activitiesInRange.length
        : 0;

    const activityScore = Math.min(
      Math.round((averageActions / 50) * 100),
      100,
    );

    const idleTime = 100 - activityScore;

    const grouped = {};

    activitiesInRange.forEach((activity) => {
      const date = new Date(activity.createdAt);

      const time = `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
      ).padStart(2, "0")}`;

      const actions =
        (activity.keyPresses || 0) +
        (activity.mouseClicks || 0) +
        (activity.mouseMoves || 0);

      const score = Math.min(Math.round((actions / 50) * 100), 100);

      if (!grouped[time]) {
        grouped[time] = {
          total: 0,
          count: 0,
        };
      }

      grouped[time].total += score;
      grouped[time].count += 1;
    });

    const chartData = [];

    const current = new Date(start);

    while (current <= end) {
      const key = `${String(current.getHours()).padStart(2, "0")}:${String(
        current.getMinutes(),
      ).padStart(2, "0")}`;

      const bucket = grouped[key];

      chartData.push({
        time: key,
        value: bucket ? Math.round(bucket.total / bucket.count) : 0,
      });

      current.setMinutes(current.getMinutes() + 1);
    }

    return res.json({
      success: true,

      activityScore,

      idleTime,

      productivePercent,
      neutralPercent,
      unproductivePercent,

      chartData,

      screenshots,

      startTime,
      endTime,
      workTime,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

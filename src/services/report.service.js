import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import Project from "../models/project.model.js";

export const getDailySummary = async (organizationId) => {
  const startOfDay = new Date();

  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();

  endOfDay.setHours(23, 59, 59, 999);

  const tasksCreated = await Task.countDocuments({
    organization: organizationId,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  const tasksCompleted = await Task.countDocuments({
    organization: organizationId,
    status: "completed",
    updatedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  const users = await User.find(
    {
      organization: organizationId,
    },
    "_id firstName lastName",
  );

  const userIds = users.map((u) => u._id);

  const activeUsers = await Session.distinct("userId", {
    userId: {
      $in: userIds,
    },
    startTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  const workSessions = await Session.aggregate([
    {
      $match: {
        userId: {
          $in: userIds,
        },
        type: "work",
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
  ]);

  const breakSessions = await Session.aggregate([
    {
      $match: {
        userId: {
          $in: userIds,
        },
        type: "break",
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
  ]);

  const breakSeconds = breakSessions[0]?.totalDuration || 0;

  const breakHours = Math.floor(breakSeconds / 3600);
  const breakMinutes = Math.floor((breakSeconds % 3600) / 60);

  const totalBreakTime = `${breakHours}h ${breakMinutes}m`;

  const totalSeconds = workSessions[0]?.totalDuration || 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const totalWorkTime = `${hours}h ${minutes}m`;

  const topPerformer = await Session.aggregate([
    {
      $match: {
        userId: {
          $in: userIds,
        },
        type: "work",
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
    {
      $sort: {
        totalDuration: -1,
      },
    },
    {
      $limit: 1,
    },
  ]);

  let topPerformerData = null;

  if (topPerformer.length > 0) {
    const performer = users.find(
      (u) => u._id.toString() === topPerformer[0]._id.toString(),
    );

    if (performer) {
      const total = topPerformer[0].totalDuration;

      topPerformerData = {
        name: `${performer.firstName} ${performer.lastName}`,
        workTime: `${Math.floor(total / 3600)}h ${Math.floor(
          (total % 3600) / 60,
        )}m`,
      };
    }
  }

  return {
    tasksCreated,
    tasksCompleted,
    activeUsers: activeUsers.length,
    totalWorkTime,
    totalBreakTime,
    topPerformer: topPerformerData,
  };
};

export const getWeeklySummary = async (organizationId) => {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(now);

  const users = await User.find(
    { organization: organizationId },
    "_id firstName lastName",
  );

  const userIds = users.map((user) => user._id);

  const tasksCreated = await Task.countDocuments({
    organization: organizationId,
    createdAt: {
      $gte: startOfWeek,
      $lte: endOfWeek,
    },
  });

  const tasksCompleted = await Task.countDocuments({
    organization: organizationId,
    status: "completed",
    updatedAt: {
      $gte: startOfWeek,
      $lte: endOfWeek,
    },
  });

  const activeUsers = await Session.distinct("userId", {
    userId: { $in: userIds },
    startTime: {
      $gte: startOfWeek,
      $lte: endOfWeek,
    },
  });

  const workTime = await Session.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        type: "work",
        startTime: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
  ]);

  const totalWorkSeconds = workTime[0]?.totalDuration || 0;

  const workHours = Math.floor(totalWorkSeconds / 3600);
  const workMinutes = Math.floor((totalWorkSeconds % 3600) / 60);

  const totalWorkTime = `${workHours}h ${workMinutes}m`;

  const breakTime = await Session.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        type: "break",
        startTime: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
  ]);

  const totalBreakSeconds = breakTime[0]?.totalDuration || 0;

  const breakHours = Math.floor(totalBreakSeconds / 3600);
  const breakMinutes = Math.floor((totalBreakSeconds % 3600) / 60);

  const totalBreakTime = `${breakHours}h ${breakMinutes}m`;

  const topPerformerData = await Session.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        type: "work",
        startTime: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: {
          $sum: "$duration",
        },
      },
    },
    {
      $sort: {
        totalDuration: -1,
      },
    },
    {
      $limit: 1,
    },
  ]);

  let topPerformer = null;

  if (topPerformerData.length > 0) {
    const performer = users.find(
      (user) => user._id.toString() === topPerformerData[0]._id.toString(),
    );

    const totalSeconds = topPerformerData[0].totalDuration;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    topPerformer = {
      name: performer
        ? `${performer.firstName} ${performer.lastName}`
        : "Unknown User",
      workTime: `${hours}h ${minutes}m`,
    };
  }

  return {
    tasksCreated,
    tasksCompleted,
    activeUsers: activeUsers.length,
    totalWorkTime,
    totalBreakTime,
    topPerformer,
  };
};

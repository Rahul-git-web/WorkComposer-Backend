import Session from "../models/session.model.js";
import Activity from "../models/activity.model.js";
import Screenshot from "../models/screenshot.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import AppUsage from "../models/appUsage.model.js";
import UsageLog from "../models/usageLog.model.js";

export const buildWeeklyReport = async (userId, startDate, endDate) => {
  const report = {
    attendance: null,

    workedSeconds: 0,
    breakSeconds: 0,
    idleSeconds: 0,

    productivity: 0,

    screenshots: 0,

    appsUsed: [],

    urlsVisited: [],

    projects: [],

    tasks: {
      local: 0,
      jira: 0,
      asana: 0,
      total: 0,
    },

    firstStartTime: null,
    lastStopTime: null,

    activeMinutes: 0,

    timeline: [],

    reportUrl: "",
  };

  const sessions = await Session.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  });

  report.workedSeconds = sessions.reduce(
    (total, session) => total + (session.workedSeconds || 0),
    0,
  );

  report.breakSeconds = sessions.reduce(
    (total, session) => total + (session.breakSeconds || 0),
    0,
  );

  const presentDays = sessions.filter(
    (session) => (session.workedSeconds || 0) > 0,
  ).length;

  report.attendance = `${presentDays} day${presentDays !== 1 ? "s" : ""}`;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );

  if (sortedSessions.length > 0) {
    report.firstStartTime = sortedSessions[0].startTime;
    report.lastStopTime = sortedSessions[sortedSessions.length - 1].endTime;
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const screenshots = await Screenshot.find({
    user: userId,
    capturedAt: {
      $gte: start,
      $lte: end,
    },
  });

  report.screenshots = screenshots.length;

  if (screenshots.length > 0) {
    const totalScore = screenshots.reduce(
      (sum, shot) => sum + (shot.activityScore || 0),
      0,
    );

    report.productivity = Math.round(totalScore / screenshots.length);
  }

  report.idleSeconds = Math.round(
    report.workedSeconds * ((100 - report.productivity) / 100),
  );

  report.activeMinutes = Math.round(
    (report.workedSeconds - report.idleSeconds) / 60,
  );

  const appUsage = await AppUsage.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ duration: -1 });

  const appMap = new Map();

  for (const app of appUsage) {
    if (!appMap.has(app.appName)) {
      appMap.set(app.appName, 0);
    }

    appMap.set(app.appName, appMap.get(app.appName) + (app.duration || 0));
  }

  report.appsUsed = [...appMap.entries()]
    .map(([appName, duration]) => ({
      appName,
      duration,
    }))
    .sort((a, b) => b.duration - a.duration);

  const usageLogs = await UsageLog.find({
    user: userId,
    startTime: {
      $gte: start,
      $lte: end,
    },
  });

  report.urlsVisited = [
    ...new Set(usageLogs.map((log) => log.url).filter(Boolean)),
  ];

  const projects = await Project.find({
    members: userId,
  }).select("name");

  report.projects = projects.map((project) => ({
    id: project._id,
    name: project.name,
  }));

  const tasks = await Task.find({
    assignedTo: userId,
  });

  report.tasks.local = tasks.filter(
    (task) => !task.jiraTaskId && !task.asanaTaskId,
  ).length;

  report.tasks.jira = tasks.filter((task) => task.jiraTaskId).length;

  report.tasks.asana = tasks.filter((task) => task.asanaTaskId).length;

  report.tasks.total =
    report.tasks.local + report.tasks.jira + report.tasks.asana;

  report.reportUrl = `/dashboard/reports/tracking?user=${userId}&start=${startDate}&end=${endDate}`;

  return report;
};

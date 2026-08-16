import Session from "../models/session.model.js";
import Activity from "../models/activity.model.js";
import Screenshot from "../models/screenshot.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import AppUsage from "../models/appUsage.model.js";
import UsageLog from "../models/usageLog.model.js";

export const buildDailyReport = async (userId, date) => {
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
    userId,
    date,
  });

  report.workedSeconds = sessions
    .filter((session) => session.type === "work")
    .reduce((total, session) => total + session.duration, 0);

  report.breakSeconds = sessions
    .filter((session) => session.type === "break")
    .reduce((total, session) => total + session.duration, 0);

  const workSessions = sessions
    .filter((session) => session.type === "work")
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  if (workSessions.length > 0) {
    report.attendance = "Present";
    report.firstStartTime = workSessions[0].startTime;
    report.lastStopTime = workSessions[workSessions.length - 1].endTime;
  } else {
    report.attendance = "Absent";
  }

  const activities = await Activity.find({
    userId,
    date,
  });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
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
    date,
  }).sort({ duration: -1 });

  report.appsUsed = appUsage.map((app) => ({
    appName: app.appName,
    duration: app.duration,
  }));

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

report.tasks.jira = tasks.filter(
  (task) => task.jiraTaskId,
).length;

report.tasks.asana = tasks.filter(
  (task) => task.asanaTaskId,
).length;

report.tasks.total =
  report.tasks.local +
  report.tasks.jira +
  report.tasks.asana;

  report.reportUrl = `/dashboard/reports/tracking?user=${userId}&date=${date}`;

  return report;
};

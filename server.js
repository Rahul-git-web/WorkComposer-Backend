import dotenv from "dotenv";
import { startSyncJobs } from "./src/jobs/sync.job.js";
import { startDailySummaryScheduler } from "./src/services/dailySummary.scheduler.js";
import { startWeeklySummaryScheduler } from "./src/services/weeklySummary.scheduler.js";
import "./src/cron/emailReports.cron.js";

dotenv.config();

import http from "http";

import { initSocket } from "./src/socket/socket.js";

import "./src/config/env.js";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

connectDB();

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);


  // Start both Jira & BambooHR cron sync jobs
  startSyncJobs();

  startDailySummaryScheduler();
  startWeeklySummaryScheduler();
});

import cron from "node-cron";
import {
  checkDailyWarning,
  checkWeeklyWarning,
} from "../services/emailReport.service.js";
import { sendDailyTrackingReports } from "../services/trackingReport.service.js";
import { sendWeeklyTrackingReports } from "../services/weeklyTrackingReport.service.js";
import User from "../models/user.model.js";

cron.schedule("0 * * * *", async () => {
  console.info("Running hourly email report cron...");
});

cron.schedule("59 23 * * *", async () => {
  try {
    console.info("Running daily email report cron...");

    const users = await User.find();

    for (const user of users) {

      await checkDailyWarning(user._id);

      await checkWeeklyWarning(user._id);
    }

    const today = new Date().toISOString().split("T")[0];

    await sendDailyTrackingReports(today);

    console.info("Daily reports completed.");
  } catch (err) {
    console.error("Daily email report cron failed:", err);
  }
});

cron.schedule("59 23 * * 0", async () => {
  try {
    console.info("Running weekly tracking report...");

    const endDate = new Date();

    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    await sendWeeklyTrackingReports(start, end);

    console.info("Weekly tracking reports sent.");
  } catch (err) {
    console.error("Weekly tracking report failed:", err);
  }
});

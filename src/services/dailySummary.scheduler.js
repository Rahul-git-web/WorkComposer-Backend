import cron from "node-cron";
import Integration from "../models/integration.model.js";
import { notifyDailySummary } from "./notification.service.js";
import User from "../models/user.model.js";

export const startDailySummaryScheduler = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.info("[Scheduler] Running Daily Summary...");

    try {
      const integrations = await Integration.find({
        provider: "slack",
        connected: true,
      }).select("organization lastDailySummarySent");

      for (const integration of integrations) {
        try {
          const today = new Date();

          today.setHours(0, 0, 0, 0);

          if (
            integration.lastDailySummarySent &&
            integration.lastDailySummarySent >= today
          ) {
            console.info(
              `[Scheduler] Daily Summary already sent today for ${integration.organization}`,
            );
            continue;
          }

          const owner = await User.findOne({
            organization: integration.organization,
            role: "owner",
          }).select("reportTimezone");

          if (!owner) {
            console.info(
              `[Scheduler] No owner found for organization ${integration.organization}`,
            );
            continue;
          }

          const timezone = owner.reportTimezone || "UTC";

          const now = new Date();

          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const [hour, minute] = formatter.format(now).split(":").map(Number);

          console.info(
            `[Scheduler] Org ${integration.organization} | ${timezone} | ${hour}:${minute}`,
          );

          if (hour === 20 && minute < 1) {
            await notifyDailySummary(integration.organization);

            integration.lastDailySummarySent = new Date();
            await integration.save();

            console.info(
              `[Scheduler] Daily Summary sent for ${integration.organization}`,
            );
          } else {
            console.info(
              `[Scheduler] Skipped ${integration.organization} (not 8:00 PM yet)`,
            );
          }
        } catch (err) {
          console.error(
            `Failed to send daily summary for organization ${integration.organization}:`,
            err.message,
          );
        }
      }

    } catch (err) {
      console.error("[Scheduler] Daily Summary failed:", err);
    }
  });

};

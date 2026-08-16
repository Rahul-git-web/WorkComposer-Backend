import cron from "node-cron";
import Integration from "../models/integration.model.js";
import User from "../models/user.model.js";
import { notifyWeeklySummary } from "./notification.service.js";

export const startWeeklySummaryScheduler = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const integrations = await Integration.find({
        provider: "slack",
        connected: true,
      }).select("organization lastWeeklySummarySent");

      for (const integration of integrations) {
        const owner = await User.findOne({
          organization: integration.organization,
          role: "owner",
        }).select("reportTimezone");

        if (!owner) continue;

        let timezone = owner.reportTimezone;

        if (!timezone || timezone === "Browser timezone") {
          timezone = "Asia/Kolkata";
        }

        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const parts = formatter.formatToParts(new Date());

        const weekday = parts.find((p) => p.type === "weekday")?.value;

        const hour = parseInt(
          parts.find((p) => p.type === "hour")?.value || "0",
        );

        const minute = parseInt(
          parts.find((p) => p.type === "minute")?.value || "0",
        );

        // Monday 8:00 PM
        if (weekday !== "Mon" || hour !== 20 || minute >= 5) {
          continue;
        }

        // Prevent duplicate weekly summary
        const now = new Date();

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        if (
          integration.lastWeeklySummarySent &&
          integration.lastWeeklySummarySent >= startOfWeek
        ) {
          continue;
        }


        await notifyWeeklySummary(integration.organization);

        integration.lastWeeklySummarySent = new Date();
        await integration.save();
      }
    } catch (error) {
      console.error("Weekly summary scheduler error:", error);
    }
  });
};

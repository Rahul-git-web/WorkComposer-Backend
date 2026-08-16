import User from "../models/user.model.js";
import { buildDailyReport } from "./reportBuilder.service.js";
import { getTrackingReportRecipients } from "./reportRecipient.service.js";
import sendEmail from "../utils/sendEmail.js";
import { dailyTrackingReportTemplate } from "../templates/dailyTrackingReportTemplate.js";
import { dailyTeamTrackingReportTemplate } from "../templates/dailyTeamTrackingReportTemplate.js";
import { dailyOrganizationTrackingReportTemplate } from "../templates/dailyOrganizationTrackingReportTemplate.js";

export const sendDailyTrackingReports = async (date) => {
  try {
    const users = await User.find({
      isVerified: true,
    }).populate("organization");

    const employeeReports = [];

    const managerReports = new Map();

    const ownerReports = new Map();

    for (const user of users) {
      const emailReportSettings = {
        ...(user.organization?.emailReports || {}),
        ...Object.fromEntries(
          Object.entries(user.emailReportSettings || {}).filter(
            ([, value]) => value !== null && value !== undefined,
          ),
        ),
      };

      if (!emailReportSettings.dailyTrackingReports) {
        continue;
      }
      const recipients = await getTrackingReportRecipients(user);

      if (!recipients.length) {
        continue;
      }

      const report = await buildDailyReport(user._id, date);

      employeeReports.push({
        user,
        report,
      });

      if (!user.manager) {
        continue;
      }

      const managerId = user.manager.toString();

      if (!managerReports.has(managerId)) {
        managerReports.set(managerId, []);
      }

      managerReports.get(managerId).push({
        user,
        report,
      });

      const owners = await User.find({
        organization: user.organization,
        role: {
          $in: ["owner", "admin"],
        },
      });

      for (const owner of owners) {
        const ownerId = owner._id.toString();

        if (!ownerReports.has(ownerId)) {
          ownerReports.set(ownerId, []);
        }
        ownerReports.get(ownerId).push({
          user,
          report,
        });
      }
    }

    for (const { user, report } of employeeReports) {
      const html = dailyTrackingReportTemplate({
        user,
        report,
        date,
      });

      await sendEmail(user.email, `Daily Tracking Report - ${date}`, html);
    }

    for (const [managerId, reports] of managerReports) {
      const manager = await User.findById(managerId);

      if (!manager) {
        continue;
      }

      const reportRows = reports
        .map(
          ({ user, report }) => `
<tr>
  <td>${user.firstName} ${user.lastName}</td>
  <td align="center">${report.attendance}</td>
  <td align="center">${Math.floor(
    report.workedSeconds / 3600,
  )}h ${Math.floor((report.workedSeconds % 3600) / 60)}m</td>
  <td align="center">${report.productivity}%</td>
</tr>
`,
        )
        .join("");

      const html = dailyTeamTrackingReportTemplate({
        manager,
        reports: reportRows,
        date,
      });

      await sendEmail(
        manager.email,
        `Daily Team Tracking Report - ${date}`,
        html,
      );
    }

    for (const [ownerId, reports] of ownerReports) {
      const owner = await User.findById(ownerId);

      if (!owner) {
        continue;
      }

      const reportRows = reports
        .map(
          ({ user, report }) => `
<tr>
  <td>${user.firstName} ${user.lastName}</td>
  <td align="center">${report.attendance}</td>
  <td align="center">
    ${Math.floor(report.workedSeconds / 3600)}h
    ${Math.floor((report.workedSeconds % 3600) / 60)}m
  </td>
  <td align="center">${report.productivity}%</td>
</tr>
`,
        )
        .join("");

      const html = dailyOrganizationTrackingReportTemplate({
        owner,
        reports: reportRows,
        date,
      });

      await sendEmail(
        owner.email,
        `Daily Organization Tracking Report - ${date}`,
        html,
      );
    }
  } catch (err) {
    console.error("Daily Tracking Report Error:", err);
  }
};

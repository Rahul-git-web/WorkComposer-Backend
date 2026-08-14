import User from "../models/user.model.js";
import { buildWeeklyReport } from "./weeklyReportBuilder.service.js";
import { getTrackingReportRecipients } from "./reportRecipient.service.js";
import sendEmail from "../utils/sendEmail.js";
import { weeklyTrackingReportTemplate } from "../templates/weeklyTrackingReportTemplate.js";
import { weeklyTeamTrackingReportTemplate } from "../templates/weeklyTeamTrackingReportTemplate.js";
import { weeklyOrganizationTrackingReportTemplate } from "../templates/weeklyOrganizationTrackingReportTemplate.js";

export const sendWeeklyTrackingReports = async (startDate, endDate) => {
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

      if (!emailReportSettings.weeklyTrackingReports) {
        continue;
      }
      const recipients = await getTrackingReportRecipients(user);

      if (!recipients.length) {
        continue;
      }

      const report = await buildWeeklyReport(user._id, startDate, endDate);

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
      const html = weeklyTrackingReportTemplate({
        user,
        report,
        startDate,
        endDate,
      });

      await sendEmail(
        user.email,
        `Weekly Tracking Report - ${startDate} - ${endDate}`,
        html,
      );
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

      const html = weeklyTeamTrackingReportTemplate({
        manager,
        reports: reportRows,
        startDate,
        endDate,
      });

      await sendEmail(
        manager.email,
        `Weekly Team Tracking Report - ${startDate} - ${endDate}`,
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

      const html = weeklyOrganizationTrackingReportTemplate({
        owner,
        reports: reportRows,
        startDate,
        endDate,
      });

      await sendEmail(
        owner.email,
        `Weekly Organization Tracking Report - ${startDate} - ${endDate}`,
        html,
      );
    }
  } catch (err) {
    console.error("Weekly Tracking Report Error:", err);
  }
};

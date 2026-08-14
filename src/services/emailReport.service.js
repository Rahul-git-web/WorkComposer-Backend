import User from "../models/user.model.js";
import Organization from "../models/organization.model.js";
import TimeTrackingSettings from "../models/timeTrackingSettings.model.js";
import Session from "../models/session.model.js";
import sendEmail from "../utils/sendEmail.js";
import dailyWarningEmailTemplate from "../templates/dailyWarningEmailTemplate.js";
import weeklyWarningEmailTemplate from "../templates/weeklyWarningEmailTemplate.js";

export const checkDailyWarning = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return;
    }

    const organization = await Organization.findById(user.organization);

    if (!organization) {
      return;
    }
    const emailReportSettings = {
      ...(organization.emailReports || {}),
      ...Object.fromEntries(
        Object.entries(user.emailReportSettings || {}).filter(
          ([, value]) => value !== null && value !== undefined,
        ),
      ),
    };

    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday...

    if (
      Array.isArray(emailReportSettings.dailyWeekDays) &&
      emailReportSettings.dailyWeekDays.length > 0 &&
      !emailReportSettings.dailyWeekDays.includes(currentDay)
    ) {
      return;
    }

    const timeTrackingSettings = await TimeTrackingSettings.findOne({
      organization: user.organization,
    });

    if (!timeTrackingSettings) {
      return;
    }

    const shiftSchedule =
      user.shiftSettings?.schedule ?? timeTrackingSettings.shift?.schedule;

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    const todayShift = shiftSchedule?.find((shift) => shift.day === today);

    if (!todayShift || !todayShift.enabled) {
      return;
    }
    const [startHour, startMinute] = todayShift.startTime
      .split(":")
      .map(Number);

    const [endHour, endMinute] = todayShift.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    let expectedWorkSeconds = 0;

    if (emailReportSettings.dailyBasedOnShift) {
      expectedWorkSeconds = (endMinutes - startMinutes) * 60;

      const breakSeconds = (todayShift.breaks || []).reduce(
        (total, breakItem) => {
          const [breakStartHour, breakStartMinute] = breakItem.startTime
            .split(":")
            .map(Number);

          const [breakEndHour, breakEndMinute] = breakItem.endTime
            .split(":")
            .map(Number);

          const breakStart = breakStartHour * 60 + breakStartMinute;
          const breakEnd = breakEndHour * 60 + breakEndMinute;

          return total + (breakEnd - breakStart) * 60;
        },
        0,
      );

      expectedWorkSeconds -= breakSeconds;
    } else {
      expectedWorkSeconds =
        (emailReportSettings.dailyMinimumTime?.hours || 0) * 3600 +
        (emailReportSettings.dailyMinimumTime?.minutes || 0) * 60;
    }

    const now = new Date();

    const todayDate = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const workSessions = await Session.find({
      userId,
      type: "work",
      date: todayDate,
    });

    const workedSeconds = workSessions.reduce(
      (total, session) => total + session.duration,
      0,
    );

    if (workedSeconds >= expectedWorkSeconds) {
      return;
    }

    if (
      user.lastDailyWarningEmail &&
      user.lastDailyWarningEmail.toDateString() === new Date().toDateString()
    ) {
      return;
    }

    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      return `${hours}h ${minutes}m`;
    };

    const html = dailyWarningEmailTemplate({
      firstName: user.firstName,
      workedTime: formatDuration(workedSeconds),
      expectedTime: formatDuration(expectedWorkSeconds),
    });

    await sendEmail(user.email, "Daily Work Time Warning", html);

    user.lastDailyWarningEmail = new Date();

    await user.save();
  } catch (error) {}
};

export const checkWeeklyWarning = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return;
    }

    const organization = await Organization.findById(user.organization);

    if (!organization) {
      return;
    }

    const emailReportSettings = {
      ...(organization.emailReports || {}),
      ...Object.fromEntries(
        Object.entries(user.emailReportSettings || {}).filter(
          ([, value]) => value !== null && value !== undefined,
        ),
      ),
    };

    if (!emailReportSettings?.weeklyWarningEmails) {
      return;
    }

    const timeTrackingSettings = await TimeTrackingSettings.findOne({
      organization: user.organization,
    });

    if (!timeTrackingSettings) {
      return;
    }

    const shiftSchedule =
      user.shiftSettings?.schedule ?? timeTrackingSettings.shift?.schedule;

    let expectedWorkSeconds = 0;

    if (emailReportSettings.weeklyBasedOnShift) {
      for (const shift of shiftSchedule || []) {

        if (!shift.enabled) continue;

        const [startHour, startMinute] = shift.startTime.split(":").map(Number);
        const [endHour, endMinute] = shift.endTime.split(":").map(Number);

        let shiftSeconds =
          (endHour * 60 + endMinute - (startHour * 60 + startMinute)) * 60;

        const breakSeconds = (shift.breaks || []).reduce((total, breakItem) => {
          const [breakStartHour, breakStartMinute] = breakItem.startTime
            .split(":")
            .map(Number);

          const [breakEndHour, breakEndMinute] = breakItem.endTime
            .split(":")
            .map(Number);

          return (
            total +
            (breakEndHour * 60 +
              breakEndMinute -
              (breakStartHour * 60 + breakStartMinute)) *
              60
          );
        }, 0);

        shiftSeconds -= breakSeconds;

        expectedWorkSeconds += shiftSeconds;

      }

    } else {
      expectedWorkSeconds =
        (emailReportSettings.weeklyMinimumTime?.hours || 0) * 3600 +
        (emailReportSettings.weeklyMinimumTime?.minutes || 0) * 60;
    }

    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);

    // Monday = first day of week
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startDate = `${startOfWeek.getFullYear()}-${String(
      startOfWeek.getMonth() + 1,
    ).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;

    const endDate = `${endOfWeek.getFullYear()}-${String(
      endOfWeek.getMonth() + 1,
    ).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

    const workSessions = await Session.find({
      userId,
      type: "work",
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const workedSeconds = workSessions.reduce(
      (total, session) => total + session.duration,
      0,
    );

    if (workedSeconds >= expectedWorkSeconds) {
      return;
    }

    const startOfCurrentWeek = new Date(startOfWeek);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    if (
      user.lastWeeklyWarningEmail &&
      user.lastWeeklyWarningEmail >= startOfCurrentWeek
    ) {
      return;
    }

    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      return `${hours}h ${minutes}m`;
    };

    const html = weeklyWarningEmailTemplate({
      firstName: user.firstName,
      workedTime: formatDuration(workedSeconds),
      expectedTime: formatDuration(expectedWorkSeconds),
    });

    await sendEmail(user.email, "Weekly Work Time Warning", html);

    user.lastWeeklyWarningEmail = new Date();
    await user.save();
  } catch (error) {
    console.error("Error checking weekly warning:", error);
  }
};

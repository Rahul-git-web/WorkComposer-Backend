import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Get the application's configured timezone.
 *
 * reportTimezone is stored on the User.
 */
export const getUserTimezone = (user) => {
  if (user?.reportTimezone && user.reportTimezone !== "Browser timezone") {
    return user.reportTimezone;
  }

  return DEFAULT_TIMEZONE;
};

/**
 * Convert a calendar date (YYYY-MM-DD)
 * in the user's timezone into the UTC start instant.
 *
 * Example:
 * 2026-08-12 + America/New_York
 * becomes the UTC instant representing
 * midnight on Aug 12 in New York.
 */
export const getStartOfDayUTC = (dateString, timezone) => {
  return fromZonedTime(`${dateString}T00:00:00`, timezone);
};

/**
 * Convert a calendar date (YYYY-MM-DD)
 * in the user's timezone into the UTC end instant.
 */
export const getEndOfDayUTC = (dateString, timezone) => {
  return fromZonedTime(`${dateString}T23:59:59.999`, timezone);
};

/**
 * Convert a UTC Date into a calendar date
 * in the user's timezone.
 */
export const getDateInTimezone = (date, timezone) => {
  return formatInTimeZone(new Date(date), timezone, "yyyy-MM-dd");
};

/**
 * Get today's calendar date in the user's timezone.
 */
export const getTodayInTimezone = (timezone) => {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
};

export const getDateRangeUTC = (startDate, endDate, timezone) => {
  return {
    start: getStartOfDayUTC(startDate, timezone),
    end: getEndOfDayUTC(endDate, timezone),
  };
};

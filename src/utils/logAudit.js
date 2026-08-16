import AuditLog from "../models/auditLog.model.js";

export const logAudit = async ({
  organization,
  performedBy,
  category,
  activity,
  details = {},
  ipAddress = "",
  platform = "",
}) => {
  try {
    await AuditLog.create({
      organization,
      performedBy,
      category,
      activity,
      details,
      ipAddress,
      platform,
    });
  } catch (err) {
    console.error("Audit Log Error:", err);
  }
};

const normalizeIp = (ip = "") => {
  if (ip === "::1") return "127.0.0.1";

  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  return ip;
};

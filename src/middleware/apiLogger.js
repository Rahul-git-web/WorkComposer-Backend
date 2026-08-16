import ApiLog from "../models/apiLog.model.js";

export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", async () => {
    try {
      // Only log requests that passed apiKeyAuth
      if (!req.apiKey || !req.organization) return;

      await ApiLog.create({
        organization: req.organization._id,
        apiKey: req.apiKey._id,

        endpoint: req.originalUrl,
        method: req.method,

        statusCode: res.statusCode,

        ipAddress: req.ip,
        userAgent: req.get("user-agent"),

        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Failed to save API log:", error);
    }
  });

  next();
};

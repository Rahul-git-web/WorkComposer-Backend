import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cors from "cors";
import teamRoutes from "./routes/teamRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import timerRoutes from "./routes/timerRoutes.js";
import screenshotRoutes from "./routes/screenshotRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import projectTrackingRoutes from "./routes/projectTrackingRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import apiRoutes from "./routes/api/apiRoutes.js";
import apiLogRoutes from "./routes/apiLogRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import timeTrackingSettingsRoutes from "./routes/timeTrackingSettingsRoutes.js";
import screenCaptureRoutes from "./routes/screenCaptureRoutes.js";
import manualTimeRoutes from "./routes/manualTimeRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import appClassificationRoutes from "./routes/appClassificationRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import manualTimeRequestRoutes from "./routes/manualTimeRequestRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhookRoutes.js";

const app = express();

app.set("trust proxy", 1);

app.use("/api/stripe/webhook", stripeWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  express.urlencoded({
    extended: true,
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);

app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/timers", timerRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/project-tracking", projectTrackingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/auditLog", auditLogRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/v1", apiRoutes);
app.use("/api/api-logs", apiLogRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/time-tracking", timeTrackingSettingsRoutes);
app.use("/api/screen-capture", screenCaptureRoutes);
app.use("/api/manual-time", manualTimeRoutes);
app.use("/api/shift", shiftRoutes);
app.use("/api/app-classifications", appClassificationRoutes);
app.use("/api/tasks", commentRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/manual-time-requests", manualTimeRequestRoutes);

export default app;

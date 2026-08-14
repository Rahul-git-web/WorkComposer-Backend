import express from "express";
import {
  connectJira,
  getJiraProjects,
  getJiraStatus,
  jiraCallback,
  jiraWebhook,
  syncJiraIssues,
  syncJiraProjects,
} from "../controllers/jira.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  asanaCallback,
  asanaWebhook,
  connectAsana,
  disconnectAsana,
  getAsanaIntegration,
  getAsanaProjects,
  getAsanaWorkspaces,
  importAsanaProjects,
} from "../controllers/asana.controller.js";
import {
  connectSlack,
  disconnectSlack,
  getSlackChannels,
  getSlackIntegration,
  handleSlackInteraction,
  saveSlackChannel,
  sendTestSlackMessage,
  slackCallback,
  updateSlackNotifications,
} from "../controllers/slack.controller.js";
import {
  connectBambooHR,
  disconnectBambooHR,
  getBambooHREmployees,
  getBambooHRIntegration,
  getBambooHRTimeOff,
  syncBambooHREmployees,
} from "../controllers/bamboohr.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { verifySlackSignature } from "../middleware/slackSignature.middleware.js";
import {
  connectKeka,
  disconnectKeka,
  getKekaEmployees,
  getKekaIntegration,
  getKekaLeaves,
  syncKekaEmployees,
} from "../controllers/keka.controller.js";
import { getAllIntegrationStatuses } from "../controllers/IntegrationStatus.controller.js";

const router = express.Router();

// Jira
router.get(
  "/jira/connect",
  protect,
  requirePermission("manage_settings"),
  connectJira,
);
router.get("/jira/callback", jiraCallback);
router.post("/jira/webhook", requirePermission("manage_settings"), jiraWebhook);
router.get(
  "/jira/projects",
  protect,
  requirePermission("manage_settings"),
  getJiraProjects,
);
router.get(
  "/jira/status",
  protect,
  requirePermission("manage_settings"),
  getJiraStatus,
);
router.post(
  "/jira/sync-projects",
  protect,
  requirePermission("manage_settings"),
  syncJiraProjects,
);
router.post(
  "/jira/sync-issues/:projectId",
  protect,
  requirePermission("manage_settings"),
  syncJiraIssues,
);

// Asana
router.get(
  "/asana/connect",
  protect,
  requirePermission("manage_settings"),
  connectAsana,
);
router.get("/asana/callback", asanaCallback);
router.post(
  "/asana/webhook",
  requirePermission("manage_settings"),
  asanaWebhook,
);
router.get(
  "/asana",
  protect,
  requirePermission("manage_settings"),
  getAsanaIntegration,
);
router.delete(
  "/asana",
  protect,
  requirePermission("manage_settings"),
  disconnectAsana,
);
router.get(
  "/asana/workspaces",
  protect,
  requirePermission("manage_settings"),
  getAsanaWorkspaces,
);
router.get(
  "/asana/workspaces/:workspace/projects",
  protect,
  requirePermission("manage_settings"),
  getAsanaProjects,
);
router.post(
  "/asana/workspaces/:workspace/import-projects",
  protect,
  requirePermission("manage_settings"),
  importAsanaProjects,
);

// Slack
router.get(
  "/slack/connect",
  protect,
  requirePermission("manage_settings"),
  connectSlack,
);
router.get("/slack/callback", slackCallback);
router.get("/slack", protect, getSlackIntegration);
router.delete(
  "/slack",
  protect,
  requirePermission("manage_settings"),
  disconnectSlack,
);
router.get(
  "/slack/channels",
  protect,
  requirePermission("manage_settings"),
  getSlackChannels,
);
router.put(
  "/slack/channel",
  protect,
  requirePermission("manage_settings"),
  saveSlackChannel,
);
router.post(
  "/slack/test-message",
  protect,
  requirePermission("manage_settings"),
  sendTestSlackMessage,
);
router.put(
  "/slack/notifications",
  protect,
  requirePermission("manage_settings"),
  updateSlackNotifications,
);
router.post(
  "/slack/interactions",
  verifySlackSignature,
  handleSlackInteraction,
);

// BambooHR
router.post(
  "/bamboohr/connect",
  protect,
  requirePermission("manage_settings"),
  connectBambooHR,
);
router.get(
  "/bamboohr",
  protect,
  requirePermission("manage_settings"),
  getBambooHRIntegration,
);
router.delete(
  "/bamboohr",
  protect,
  requirePermission("manage_settings"),
  disconnectBambooHR,
);
router.get(
  "/bamboohr/employees",
  protect,
  requirePermission("manage_settings"),
  getBambooHREmployees,
);
router.post(
  "/bamboohr/sync-employees",
  protect,
  requirePermission("manage_settings"),
  syncBambooHREmployees,
);
router.get(
  "/bamboohr/time-off",
  protect,
  requirePermission("manage_settings"),
  getBambooHRTimeOff,
);

// Keka HR
router.post(
  "/keka/connect",
  protect,
  requirePermission("manage_settings"),
  connectKeka,
);
router.get(
  "/keka",
  protect,
  requirePermission("manage_settings"),
  getKekaIntegration,
);
router.delete(
  "/keka",
  protect,
  requirePermission("manage_settings"),
  disconnectKeka,
);
router.get(
  "/keka/employees",
  protect,
  requirePermission("manage_settings"),
  getKekaEmployees,
);
router.post(
  "/keka/sync-employees",
  protect,
  requirePermission("manage_settings"),
  syncKekaEmployees,
);
router.get(
  "/keka/leaves",
  protect,
  requirePermission("manage_settings"),
  getKekaLeaves,
);

router.get(
  "/status-summary",
  protect,
  getAllIntegrationStatuses,
);

export default router;

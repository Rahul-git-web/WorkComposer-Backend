import Integration from "../models/integration.model.js";
import Organization from "../models/organization.model.js";
import User from "../models/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import taskAssignedEmailTemplate from "../templates/taskAssignedEmailTemplate.js";
import { sendSlackMessage } from "./slack.service.js";
import {
  buildTaskAssignedMessage,
  buildTaskUpdatedMessage,
  buildTaskReassignedMessage,
  buildTaskCompletedMessage,
  buildDailySummaryMessage,
  buildWeeklySummaryMessage,
} from "./slackMessages.js";
import { getDailySummary, getWeeklySummary } from "./report.service.js";

const sendSlackNotification = async (
  organizationId,
  notificationType,
  fallbackText,
  blocks,
) => {
  const integration = await Integration.findOne({
    organization: organizationId,
    provider: "slack",
    connected: true,
  });

  if (!integration?.slackChannelId) {
    return;
  }

  if (
    integration.notifications &&
    integration.notifications[notificationType] === false
  ) {
    return;
  }

  await sendSlackMessage(
    organizationId,
    integration.slackChannelId,
    fallbackText,
    blocks,
  );
};

export const notifyTaskAssigned = async ({
  organizationId,
  assignedTo,
  title,
  project,
  priority,
  status,
  dueDate,
  createdBy,
  taskId,
}) => {
  try {
    const blocks = buildTaskAssignedMessage({
      taskId,
      title,
      project,
      assignedTo,
      priority,
      status,
      dueDate,
      createdBy,
    });

    await sendSlackNotification(
      organizationId,
      "taskAssigned",
      "New Task Assigned",
      blocks,
    );

    const organization = await Organization.findById(organizationId);

    if (organization?.taskManagement?.notifyTaskAssignedEmail === false) {
      return;
    }

    const assignedUser = await User.findOne({
      organization: organizationId,
      firstName: assignedTo.split(" ")[0],
      lastName: assignedTo.split(" ").slice(1).join(" "),
    });

    if (!assignedUser) {
      console.info("USER NOT FOUND");
      return;
    }

    const html = taskAssignedEmailTemplate({
      firstName: assignedUser.firstName,
      title,
      project,
      priority,
      status,
      dueDate,
      createdBy,
      taskId,
    });

    await sendEmail(assignedUser.email, "New Task Assigned", html);
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

export const notifyTaskUpdated = async ({
  organizationId,
  title,
  changes,
  updatedBy,
}) => {
  try {
    const blocks = buildTaskUpdatedMessage({
      title,
      updatedBy,
      changes,
    });

    await sendSlackNotification(
      organizationId,
      "taskUpdated",
      "Task Updated",
      blocks,
    );
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

export const notifyTaskReassigned = async ({
  organizationId,
  title,
  previousAssignee,
  newAssignee,
  reassignedBy,
}) => {
  try {
    const blocks = buildTaskReassignedMessage({
      title,
      previousAssignee,
      newAssignee,
      reassignedBy,
    });

    await sendSlackNotification(
      organizationId,
      "taskReassigned",
      "Task Reassigned",
      blocks,
    );
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

export const notifyTaskCompleted = async ({
  organizationId,
  title,
  completedBy,
}) => {
  try {
    const blocks = buildTaskCompletedMessage({
      title,
      completedBy,
      completedAt: new Date().toLocaleString(),
    });

    await sendSlackNotification(
      organizationId,
      "taskCompleted",
      "Task Completed",
      blocks,
    );
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

export const notifyTaskEvents = async ({
  previousTask,
  task,
  changes,
  previousAssignedUser,
  newAssignedUser,
  updatedBy,
}) => {
  if (changes.length > 0) {
    await notifyTaskUpdated({
      organizationId: task.organization,
      title: task.title,
      changes,
      updatedBy: `${updatedBy.firstName} ${updatedBy.lastName}`,
    });
  }

  if (previousTask.assignedTo !== task.assignedTo?.toString()) {
    await notifyTaskReassigned({
      organizationId: task.organization,
      title: task.title,
      previousAssignee: previousAssignedUser
        ? `${previousAssignedUser.firstName} ${previousAssignedUser.lastName}`
        : null,
      newAssignee: newAssignedUser
        ? `${newAssignedUser.firstName} ${newAssignedUser.lastName}`
        : null,
      reassignedBy: `${updatedBy.firstName} ${updatedBy.lastName}`,
    });
  }

  if (previousTask.status !== "completed" && task.status === "completed") {
    await notifyTaskCompleted({
      organizationId: task.organization,
      title: task.title,
      completedBy: `${updatedBy.firstName} ${updatedBy.lastName}`,
    });
  }
};

export const notifyDailySummary = async (organizationId) => {
  try {
    const summary = await getDailySummary(organizationId);

    const blocks = buildDailySummaryMessage({
      date: new Date().toLocaleDateString(),
      ...summary,
    });

    await sendSlackNotification(
      organizationId,
      "dailySummary",
      "Daily Work Summary",
      blocks,
    );
  } catch (err) {
    console.error("Daily Summary Notification Error:", err.message);
  }
};

export const notifyWeeklySummary = async (organizationId) => {
  const summary = await getWeeklySummary(organizationId);
  const endDate = new Date();

  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const formattedStartDate = startDate.toLocaleDateString();
  const formattedEndDate = endDate.toLocaleDateString();

  const blocks = buildWeeklySummaryMessage({
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    ...summary,
  });

  await sendSlackNotification(
    organizationId,
    "weeklySummary",
    "Weekly Work Summary",
    blocks,
  );
};

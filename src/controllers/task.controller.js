import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import Integration from "../models/integration.model.js";
import Project from "../models/project.model.js";
import { refreshJiraToken } from "../utils/jiraToken.js";
import { refreshAsanaToken } from "../utils/asanaToken.js";
import { markAsanaSync } from "../utils/asanaSyncCache.js";
import {
  notifyTaskAssigned,
  notifyTaskEvents,
} from "../services/notification.service.js";
import { hasPermission } from "../middleware/permission.middleware.js";
import axios from "axios";

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    if (!canManageTasks) {
      return res.status(403).json({
        message: "You do not have permission to create tasks.",
      });
    }

    const {
      title,
      description,
      priority,
      status,
      assignedTo,
      dueDate,
      project,
    } = req.body;

    const projectDoc = await Project.findById(project);

    if (!projectDoc) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    let provider = "local";
    let jiraIssueId = null;
    let jiraIssueKey = null;

    let asanaTaskId = null;

    if (projectDoc.provider === "jira") {
      const integration = await Integration.findOne({
        organization: req.user.organization,
        provider: "jira",
        connected: true,
      });

      if (new Date() >= integration.expiresAt) {
        await refreshJiraToken(integration);
      }

      const { data } = await axios.post(
        `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue`,
        {
          fields: {
            project: {
              key: projectDoc.jiraProjectKey,
            },
            summary: title,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: description || "",
                    },
                  ],
                },
              ],
            },
            issuetype: {
              name: "Task",
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      provider = "jira";
      jiraIssueId = data.id;
      jiraIssueKey = data.key;
    }

    if (projectDoc.provider === "asana") {
      const integration = await Integration.findOne({
        organization: req.user.organization,
        provider: "asana",
        connected: true,
      });

      if (!integration) {
        return res.status(400).json({
          message: "Asana is not connected",
        });
      }

      if (new Date() >= integration.expiresAt) {
        await refreshAsanaToken(integration);
      }

      let assignee = null;

      if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);

        if (assignedUser?.asanaAccountId) {
          assignee = assignedUser.asanaAccountId;
        }
      }

      const { data } = await axios.post(
        "https://app.asana.com/api/1.0/tasks",
        {
          data: {
            name: title,
            notes: description || "",
            projects: [projectDoc.asanaProjectId],

            due_on: dueDate
              ? new Date(dueDate).toISOString().split("T")[0]
              : undefined,

            assignee,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      provider = "asana";
      asanaTaskId = data.data.gid;
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      assignedTo,
      dueDate,
      project,

      provider,
      jiraIssueId,
      jiraIssueKey,

      asanaTaskId,

      assignedBy: req.user._id,
      organization: req.user.organization,
    });

    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);

      await notifyTaskAssigned({
        taskId: task._id.toString(),
        organizationId: req.user.organization,
        title: task.title,
        project: projectDoc.name,
        assignedTo: `${assignedUser.firstName} ${assignedUser.lastName}`,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        createdBy: `${req.user.firstName} ${req.user.lastName}`,
      });
    }

    res.status(201).json(task);
  } catch (err) {
    console.error("CREATE TASK ERROR");
    console.error(err.response?.data || err);
    console.error(err.response?.status);

    return res.status(500).json({
      message: err.response?.data || err.message,
    });
  }
};

// GET TASK
export const getTasks = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    let query = {
      organization: req.user.organization,
      deleted: false,
    };

    if (!canManageTasks) {
      const managedUsers = await User.find(
        {
          organization: req.user.organization._id || req.user.organization,
          manager: req.user._id,
        },
        "_id",
      );

      const userIds = [req.user._id, ...managedUsers.map((user) => user._id)];

      query.assignedTo = {
        $in: userIds,
      };
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("project", "_id name")
      .sort({ createdAt: -1 });

    const formattedTasks = tasks.map((task) => {
      const obj = task.toObject();

      if (obj.assignedTo) {
        obj.assignedTo.avatar = getAvatarUrl(obj.assignedTo.avatar);
      }

      return obj;
    });

    res.status(200).json(formattedTasks);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// GET RECENTLY DELETED TASKS
export const getRecentlyDeletedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      organization: req.user.organization,
      deleted: true,
    })
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("project", "_id name")
      .populate("deletedBy", "firstName lastName")
      .sort({ deletedAt: -1 });

    const formattedTasks = tasks.map((task) => {
      const obj = task.toObject();

      if (obj.assignedTo) {
        obj.assignedTo.avatar = getAvatarUrl(obj.assignedTo.avatar);
      }

      return obj;
    });

    return res.status(200).json(formattedTasks);
  } catch (err) {
    console.error("GET RECENTLY DELETED TASKS ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// RESTORE DELETED TASK
export const restoreTask = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    if (!canManageTasks) {
      return res.status(403).json({
        message: "You do not have permission to restore tasks.",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deleted: true,
    });

    if (!task) {
      return res.status(404).json({
        message: "Deleted task not found.",
      });
    }

    task.deleted = false;
    task.deletedAt = null;
    task.deletedBy = null;

    await task.save();

    return res.status(200).json({
      message: "Task restored successfully.",
      task,
    });
  } catch (err) {
    console.error("RESTORE TASK ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const permanentlyDeleteTask = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    if (!canManageTasks) {
      return res.status(403).json({
        message: "You do not have permission to permanently delete tasks.",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      deleted: true,
    });

    if (!task) {
      return res.status(404).json({
        message: "Deleted task not found.",
      });
    }

    await Task.deleteOne({
      _id: task._id,
    });

    return res.status(200).json({
      message: "Task permanently deleted.",
    });
  } catch (err) {
    console.error("PERMANENT DELETE TASK ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// UPDATE TASK
export const updateTask = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    if (!canManageTasks) {
      return res.status(403).json({
        message: "You do not have permission to update tasks.",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const previousTask = {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo?.toString(),
      status: task.status,
    };

    Object.assign(task, req.body);

    await task.save();

    const previousAssignedUser = previousTask.assignedTo
      ? await User.findById(previousTask.assignedTo)
      : null;

    const newAssignedUser = task.assignedTo
      ? await User.findById(task.assignedTo)
      : null;

    const project = task.project
      ? await Project.findById(task.project).select("name")
      : null;

    const changes = [];

    if (previousTask.title !== task.title) {
      changes.push({
        field: "Title",
        oldValue: previousTask.title,
        newValue: task.title,
      });
    }

    if (previousTask.description !== task.description) {
      changes.push({
        field: "Description",
        oldValue: previousTask.description || "Empty",
        newValue: task.description || "Empty",
      });
    }

    if (previousTask.status !== task.status) {
      changes.push({
        field: "Status",
        oldValue: previousTask.status,
        newValue: task.status,
      });
    }

    if (String(previousTask.dueDate || "") !== String(task.dueDate || "")) {
      changes.push({
        field: "Due Date",
        oldValue: previousTask.dueDate
          ? new Date(previousTask.dueDate).toLocaleDateString()
          : "Not set",
        newValue: task.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : "Not set",
      });
    }

    await notifyTaskEvents({
      previousTask,
      task,
      changes,
      previousAssignedUser,
      newAssignedUser,
      updatedBy: req.user,
    });

    if (
      previousTask.assignedTo !== task.assignedTo?.toString() &&
      newAssignedUser
    ) {
      await notifyTaskAssigned({
        taskId: task._id,
        organizationId: task.organization,
        title: task.title,
        project: project?.name || "",
        assignedTo: `${newAssignedUser.firstName} ${newAssignedUser.lastName}`,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        createdBy: `${req.user.firstName} ${req.user.lastName}`,
      });
    }

    if (task.provider === "jira") {
      const integration = await Integration.findOne({
        organization: task.organization,
        provider: "jira",
        connected: true,
      });

      if (integration) {
        if (new Date() >= integration.expiresAt) {
          await refreshJiraToken(integration);
        }

        await axios.put(
          `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}`,
          {
            fields: {
              summary: task.title,
              description: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: task.description || "",
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
        );

        const assignedUser = await User.findById(task.assignedTo);

        if (assignedUser?.jiraAccountId) {
          await axios.put(
            `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}/assignee`,
            {
              accountId: assignedUser.jiraAccountId,
            },
            {
              headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            },
          );
        }

        try {
          const { data: transitions } = await axios.get(
            `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}/transitions`,
            {
              headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                Accept: "application/json",
              },
            },
          );

          let transitionName = "To Do";

          if (task.status === "in-progress") {
            transitionName = "In Progress";
          }

          if (task.status === "completed") {
            transitionName = "Done";
          }

          const transition = transitions.transitions.find(
            (t) => t.name === transitionName,
          );

          if (transition) {
            await axios.post(
              `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}/transitions`,
              {
                transition: {
                  id: transition.id,
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${integration.accessToken}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              },
            );
          }
        } catch (err) {
          console.error(
            "Failed to update Jira transition:",
            err.response?.data || err.message,
          );
        }
      }
    }

    if (task.provider === "asana") {
      const integration = await Integration.findOne({
        organization: task.organization,
        provider: "asana",
        connected: true,
      });

      if (!integration) {
        return res.status(400).json({
          message: "Asana is not connected",
        });
      }

      if (!task.asanaTaskId) {
        return res.status(400).json({
          message: "Asana task ID is missing",
        });
      }

      if (new Date() >= integration.expiresAt) {
        await refreshAsanaToken(integration);
      }

      const assignedUser = task.assignedTo
        ? await User.findById(task.assignedTo)
        : null;

      markAsanaSync(task._id.toString());

      const updateData = {};

      if (previousTask.title !== task.title) {
        updateData.name = task.title;
      }

      if (previousTask.description !== task.description) {
        updateData.notes = task.description || "";
      }

      if (String(previousTask.dueDate || "") !== String(task.dueDate || "")) {
        updateData.due_on = task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : null;
      }

      if (previousTask.status !== task.status) {
        updateData.completed = task.status === "completed";
      }

      if (previousTask.assignedTo !== task.assignedTo?.toString()) {
        updateData.assignee = assignedUser?.asanaAccountId || null;
      }

      if (Object.keys(updateData).length > 0) {
        await axios.put(
          `https://app.asana.com/api/1.0/tasks/${task.asanaTaskId}`,
          {
            data: updateData,
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } else {
      }

      if (assignedUser?.asanaAccountId) {
      } else {
      }
    }

    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const canManageTasks = await hasPermission(req.user, "manage_tasks");

    if (!canManageTasks) {
      return res.status(403).json({
        message: "You do not have permission to delete tasks.",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (task.provider === "jira") {
      const integration = await Integration.findOne({
        organization: task.organization,
        provider: "jira",
        connected: true,
      });

      if (!integration) {
        return res.status(400).json({
          message: "Jira is not connected",
        });
      }

      if (!task.jiraIssueKey) {
        return res.status(400).json({
          message: "Jira issue key is missing",
        });
      }

      if (new Date() >= integration.expiresAt) {
        await refreshJiraToken(integration);
      }

      await axios.delete(
        `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Accept: "application/json",
          },
        },
      );
    }

    if (task.provider === "asana") {
      const integration = await Integration.findOne({
        organization: task.organization,
        provider: "asana",
        connected: true,
      });

      if (!integration) {
        return res.status(400).json({
          message: "Asana is not connected",
        });
      }

      if (!task.asanaTaskId) {
        return res.status(400).json({
          message: "Asana task ID is missing",
        });
      }

      if (new Date() >= integration.expiresAt) {
        await refreshAsanaToken(integration);
      }

      await axios.delete(
        `https://app.asana.com/api/1.0/tasks/${task.asanaTaskId}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
          },
        },
      );
    }

    task.deleted = true;
    task.deletedAt = new Date();
    task.deletedBy = req.user._id;

    await task.save();

    return res.status(200).json({
      message: "Task moved to Recently Deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// SELECTED DELETE TASK
export const deleteMultipleTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;

    const tasks = await Task.find({
      _id: { $in: taskIds },
    });

    for (const task of tasks) {
      if (task.provider === "jira") {
        const integration = await Integration.findOne({
          organization: task.organization,
          provider: "jira",
          connected: true,
        });

        if (integration && task.jiraIssueKey) {
          if (new Date() >= integration.expiresAt) {
            await refreshJiraToken(integration);
          }

          try {
            await axios.delete(
              `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue/${task.jiraIssueKey}`,
              {
                headers: {
                  Authorization: `Bearer ${integration.accessToken}`,
                  Accept: "application/json",
                },
              },
            );
          } catch (error) {
            console.error(
              `Failed to delete Jira issue ${task.jiraIssueKey}:`,
              error.response?.data || error.message,
            );
          }
        }
      }

      if (task.provider === "asana") {
        const integration = await Integration.findOne({
          organization: task.organization,
          provider: "asana",
          connected: true,
        });

        if (integration && task.asanaTaskId) {
          if (new Date() >= integration.expiresAt) {
            await refreshAsanaToken(integration);
          }

          try {
            await axios.delete(
              `https://app.asana.com/api/1.0/tasks/${task.asanaTaskId}`,
              {
                headers: {
                  Authorization: `Bearer ${integration.accessToken}`,
                },
              },
            );
          } catch (error) {
            console.error(
              `Failed to delete Asana task ${task.asanaTaskId}:`,
              error.response?.data || error.message,
            );
          }
        }
      }
    }

    await Task.updateMany(
      {
        _id: { $in: taskIds },
        organization: req.user.organization,
      },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: req.user._id,
        },
      },
    );

    res.status(200).json({
      message: "Tasks moved to Recently Deleted",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

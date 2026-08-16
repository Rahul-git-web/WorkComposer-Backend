import axios from "axios";
import Integration from "../models/integration.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { refreshJiraToken } from "../utils/jiraToken.js";
import User from "../models/user.model.js";

export const connectJira = async (req, res) => {
  try {
    const url =
      `https://auth.atlassian.com/authorize` +
      `?audience=api.atlassian.com` +
      `&client_id=${process.env.JIRA_CLIENT_ID}` +
      `&scope=offline_access read:jira-work write:jira-work read:jira-user` +
      `&redirect_uri=${encodeURIComponent(process.env.JIRA_REDIRECT_URI)}` +
      `&state=${req.user.organization._id}` +
      `&response_type=code` +
      `&prompt=consent`;

    return res.redirect(url);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to connect Jira",
    });
  }
};

export const jiraCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const { data } = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: process.env.JIRA_REDIRECT_URI,
      },
    );

    const { data: resources } = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          Accept: "application/json",
        },
      },
    );

    const { data: jiraUser } = await axios.get(
      `https://api.atlassian.com/ex/jira/${resources[0].id}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          Accept: "application/json",
        },
      },
    );

    const updatedUser = await User.findOneAndUpdate(
      {
        email: jiraUser.emailAddress,
      },
      {
        jiraAccountId: jiraUser.accountId,
      },
      {
        returnDocument: "after",
      },
    );

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await Integration.findOneAndUpdate(
      {
        organization: req.query.state,
        provider: "jira",
      },
      {
        connected: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        cloudId: resources[0].id,
        siteUrl: resources[0].url,
        workspaceName: resources[0].name,
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/settings/account/integrations/jira`,
    );
  } catch (err) {
    console.error(
      "[Jira] Connection failed:",
      err.response?.data || err.message,
    );

    res.status(500).json({
      message: "Failed to connect Jira",
      error: err.response?.data || err.message,
    });
  }
};

export const jiraWebhook = async (req, res) => {
  try {

    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
};

export const getJiraProjects = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization,
      provider: "jira",
      connected: true,
    });

    if (!integration) {
      return res.status(404).json({
        message: "Jira is not connected",
      });
    }

    const { data } = await axios.get(
      `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          Accept: "application/json",
        },
      },
    );

    return res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch Jira projects",
    });
  }
};

export const getJiraStatus = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization,
      provider: "jira",
    });

    if (!integration) {
      return res.json({
        connected: false,
      });
    }

    return res.json({
      connected: integration.connected,
      workspaceName: integration.workspaceName,
      siteUrl: integration.siteUrl,
      provider: integration.provider,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to get Jira status",
    });
  }
};

export const syncJiraProjects = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization,
      provider: "jira",
      connected: true,
    });

    if (!integration) {
      return res.status(404).json({
        message: "Jira is not connected",
      });
    }

    if (new Date() >= integration.expiresAt) {
      await refreshJiraToken(integration);
    }

    const accessToken = integration.accessToken;

    const { data: jiraProjects } = await axios.get(
      `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    for (const jiraProject of jiraProjects) {
      const existingProject = await Project.findOne({
        organization: req.user.organization,
        name: jiraProject.name,
      });

      if (existingProject) {
        continue;
      }

      await Project.create({
        name: jiraProject.name,

        jiraProjectId: jiraProject.id,
        jiraProjectKey: jiraProject.key,
        provider: "jira",

        organization: req.user.organization,
        createdBy: req.user._id,

        teams: [],
        users: [],
      });
    }

    return res.json({
      message: "Projects synced successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to sync Jira projects",
    });
  }
};

const syncProjectIssues = async (project) => {
  // Find Jira integration
  const integration = await Integration.findOne({
    organization: project.organization,
    provider: "jira",
    connected: true,
  });

  if (!integration) {
    throw new Error("Jira is not connected");
  }

  if (new Date() >= integration.expiresAt) {
    await refreshJiraToken(integration);
  }

  // Fetch Jira issues
  const { data: issues } = await axios.get(
    `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/search/jql`,
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        Accept: "application/json",
      },
      params: {
        jql: `project= "${project.jiraProjectKey}"`,
        maxResults: 100,
        fields: "summary,status,assignee,priority,issuetype",
      },
    },
  );

  for (const issue of issues.issues) {
    let status = "todo";

    if (issue.fields.status.name.toLowerCase().includes("progress")) {
      status = "in-progress";
    }

    if (
      issue.fields.status.name.toLowerCase().includes("done") ||
      issue.fields.status.name.toLowerCase().includes("complete")
    ) {
      status = "completed";
    }

    let assignedUser = null;

    if (issue.fields.assignee?.accountId) {
      assignedUser = await User.findOne({
        jiraAccountId: issue.fields.assignee.accountId,
      });
    }

    const existingTask = await Task.findOne({
      jiraIssueId: issue.id,
    });

    if (existingTask) {
      const changed =
        existingTask.title !== issue.fields.summary ||
        existingTask.status !== status ||
        existingTask.priority !==
          (issue.fields.priority?.name?.toLowerCase() || "medium") ||
        String(existingTask.assignedTo || "") !==
          String(assignedUser?._id || "");

      if (!changed) {
        continue;
      }
    }

    await Task.findOneAndUpdate(
      {
        jiraIssueId: issue.id,
      },
      {
        title: issue.fields.summary,
        description: "",

        status,

        priority: issue.fields.priority?.name?.toLowerCase() || "medium",

        jiraIssueId: issue.id,
        jiraIssueKey: issue.key,
        provider: "jira",

        project: project._id,
        organization: project.organization,
        assignedTo: assignedUser?._id,
        assignedBy: project.createdBy,
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );
  }
};

export const syncAllJiraProjects = async () => {
  const projects = await Project.find({
    provider: "jira",
  });

  for (const project of projects) {
    await syncProjectIssues(project);
  }
};

export const syncJiraIssues = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Find WorkComposer project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await syncProjectIssues(project);

    return res.json({
      message: "Project synced successfully",
    });
  } catch (err) {
    console.error(
      "[Jira] Failed to sync issues:",
      err.response?.data || err.message,
    );

    return res.status(500).json({
      message: "Failed to sync issues",
      error: err.response?.data || err.message,
    });
  }
};

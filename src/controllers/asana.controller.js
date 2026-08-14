import axios from "axios";
import Integration from "../models/integration.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { refreshAsanaToken } from "../utils/asanaToken.js";
import { isAsanaSyncing } from "../utils/asanaSyncCache.js";

export const connectAsana = async (req, res) => {
  try {
    const state = Buffer.from(
      JSON.stringify({
        organization: req.user.organization._id,
        user: req.user._id,
      }),
    ).toString("base64");

    const url =
      `https://app.asana.com/-/oauth_authorize` +
      `?client_id=${process.env.ASANA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.ASANA_REDIRECT_URI)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;

    return res.json({ url });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to connect Asana",
    });
  }
};

export const asanaCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    const decodedState = JSON.parse(
      Buffer.from(decodeURIComponent(state), "base64").toString(),
    );

    const organizationId = decodedState.organization;
    const userId = decodedState.user;

    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/settings/account/integrations/asana?status=cancelled`,
      );
    }

    const params = new URLSearchParams();

    params.append("grant_type", "authorization_code");
    params.append("client_id", process.env.ASANA_CLIENT_ID);
    params.append("client_secret", process.env.ASANA_CLIENT_SECRET);
    params.append("redirect_uri", process.env.ASANA_REDIRECT_URI);
    params.append("code", code);

    const response = await axios.post(
      "https://app.asana.com/-/oauth_token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { data: asanaUser } = await axios.get(
      "https://app.asana.com/api/1.0/users/me",
      {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
        },
      },
    );

    const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

    await Integration.findOneAndUpdate(
      {
        organization: organizationId,
        provider: "asana",
      },
      {
        connected: true,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt,
        accountId: asanaUser.data.gid,
        email: asanaUser.data.email,
        workspaceId: asanaUser.data.workspaces?.[0]?.gid || "",
        workspaceName: asanaUser.data.workspaces?.[0]?.name || "",
      },
      {
        upsert: true,
        new: true,
      },
    );

    await User.findByIdAndUpdate(userId, {
      asanaAccountId: asanaUser.data.gid,
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/settings/account/integrations/asana`,
    );
  } catch (error) {
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      message: "Asana callback failed",
      error: error.response?.data || error.message,
    });
  }
};

export const asanaWebhook = async (req, res) => {
  const hookSecret = req.headers["x-hook-secret"];

  if (hookSecret) {
    return res.set("X-Hook-Secret", hookSecret).sendStatus(200);
  }

  const { events } = req.body;

  for (const event of events || []) {
    if (
      event.resource?.resource_type !== "task" ||
      !["changed", "deleted"].includes(event.action)
    ) {
      continue;
    }
    const taskGid = event.resource.gid;

    if (event.action === "deleted") {
      await Task.findOneAndDelete({
        provider: "asana",
        asanaTaskId: taskGid,
      });

      continue;
    }

    const integration = await Integration.findOne({
      provider: "asana",
      connected: true,
    });

    if (!integration) {
      continue;
    }

    if (new Date() >= integration.expiresAt) {
      await refreshAsanaToken(integration);
    }

    let asanaTask;

    try {
      const { data } = await axios.get(
        `https://app.asana.com/api/1.0/tasks/${taskGid}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
          },
        },
      );

      asanaTask = data.data;
    } catch (error) {
      console.error(
        "Failed to fetch Asana task:",
        taskGid,
        error.response?.data || error.message,
      );

      continue;
    }

    const task = await Task.findOne({
      provider: "asana",
      asanaTaskId: taskGid,
    });

    if (task && isAsanaSyncing(task._id.toString())) {
      return res.sendStatus(200);
    }

    if (!task) {
      continue;
    }

    task.title = asanaTask.name;
    task.description = asanaTask.notes;
    task.dueDate = asanaTask.due_on ? new Date(asanaTask.due_on) : null;

    task.status = asanaTask.completed ? "completed" : "todo";

    await task.save();
  }

  return res.sendStatus(200);
};

export const getAsanaIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "asana",
    });

    return res.json(integration);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch Asana integration",
    });
  }
};

export const disconnectAsana = async (req, res) => {
  try {
    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "asana",
      },
      {
        connected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        accountId: null,
        email: null,
        workspaceName: null,
      },
    );

    return res.json({
      message: "Asana disconnected successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to disconnect Asana",
    });
  }
};

export const getAsanaWorkspaces = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
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

    const { data } = await axios.get(
      "https://app.asana.com/api/1.0/workspaces",
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      },
    );

    return res.json(data.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to fetch workspaces",
    });
  }
};

export const getAsanaProjects = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
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

    const { workspace } = req.params;

    const { data } = await axios.get(
      `https://app.asana.com/api/1.0/workspaces/${workspace}/projects`,
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      },
    );

    return res.json(data.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to fetch projects",
    });
  }
};

export const importAsanaProjects = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
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

    const { workspace } = req.params;

    const { data } = await axios.get("https://app.asana.com/api/1.0/projects", {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
      },
      params: {
        workspace,
      },
    });

    const importedProjects = [];

    for (const asanaProject of data.data) {
      const exists = await Project.findOne({
        organization: req.user.organization,
        provider: "asana",
        asanaProjectId: asanaProject.gid,
      });

      if (exists) {
        continue;
      }

      const project = await Project.create({
        name: asanaProject.name,
        provider: "asana",
        asanaProjectId: asanaProject.gid,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      // Register webhook for this project
      try {
        const { data: webhook } = await axios.post(
          "https://app.asana.com/api/1.0/webhooks",
          {
            data: {
              resource: asanaProject.gid,
              target: `${process.env.BACKEND_URL}/api/integrations/asana/webhook`,
             
            },
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        project.asanaWebhookId = webhook.data.gid;
        await project.save();
      } catch (err) {
        console.error(
          `Failed to create webhook for ${project.name}`,
          err.response?.data || err.message,
        );
      }

      importedProjects.push(project);
    }

    return res.json({
      message:
        importedProjects.length > 0
          ? `${importedProjects.length} project${importedProjects.length > 1 ? "s" : ""} imported successfully.`
          : "All Asana projects are already imported.",
      importedCount: importedProjects.length,
      projects: importedProjects,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to import projects",
    });
  }
};

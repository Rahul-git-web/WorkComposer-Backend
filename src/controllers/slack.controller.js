import axios from "axios";
import Integration from "../models/integration.model.js";
import User from "../models/user.model.js";
import { sendSlackMessage } from "../services/slack.service.js";

export const connectSlack = async (req, res) => {
  try {
    const state = Buffer.from(
      JSON.stringify({
        organization: req.user.organization._id,
        user: req.user._id,
      }),
    ).toString("base64");

    const scopes = [
      "chat:write",
      "channels:read",
      "groups:read",
      "users:read",
      "team:read",
    ].join(",");

    const url =
      `https://slack.com/oauth/v2/authorize` +
      `?client_id=${process.env.SLACK_CLIENT_ID}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}`;

    return res.json({ url });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to connect Slack",
    });
  }
};

export const slackCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/settings/account/integrations/slack?status=cancelled`,
      );
    }

    const decodedState = JSON.parse(
      Buffer.from(decodeURIComponent(state), "base64").toString(),
    );

    const organizationId = decodedState.organization;
    const userId = decodedState.user;

    const params = new URLSearchParams();

    params.append("client_id", process.env.SLACK_CLIENT_ID);
    params.append("client_secret", process.env.SLACK_CLIENT_SECRET);
    params.append("code", code);
    params.append("redirect_uri", process.env.SLACK_REDIRECT_URI);

    const { data } = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (!data.ok) {
      throw new Error(data.error);
    }

    const team = data.team;

    await Integration.findOneAndUpdate(
      {
        organization: organizationId,
        provider: "slack",
      },
      {
        connected: true,
        accessToken: data.access_token,
        workspaceId: team.id,
        workspaceName: team.name,
        userId: data.authed_user.id,
      },
      {
        upsert: true,
        new: true,
      },
    );

    await User.findByIdAndUpdate(userId, {
      slackUserId: data.authed_user.id,
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/settings/account/integrations/slack`,
    );
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Slack callback failed",
    });
  }
};

export const getSlackIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "slack",
    });

    return res.json(integration);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch Slack integration",
    });
  }
};

export const disconnectSlack = async (req, res) => {
  try {
    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "slack",
      },
      {
        connected: false,
        accessToken: null,
        workspaceId: null,
        workspaceName: null,
        userId: null,
      },
    );

    return res.json({
      message: "Slack disconnected successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to disconnect Slack",
    });
  }
};

export const getSlackChannels = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "slack",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "Slack is not connected",
      });
    }

    const { data } = await axios.get(
      "https://slack.com/api/conversations.list",
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
        params: {
          types: "public_channel,private_channel",
          exclude_archived: true,
          limit: 1000,
        },
      },
    );

    if (!data.ok) {
      return res.status(400).json({
        message: data.error,
      });
    }

    const channels = data.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
    }));

    return res.status(200).json(channels);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch Slack channels",
    });
  }
};

export const saveSlackChannel = async (req, res) => {
  try {
    const { channelId, channelName } = req.body;

    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "slack",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "Slack is not connected",
      });
    }

    integration.slackChannelId = channelId;
    integration.slackChannelName = channelName;

    await integration.save();

    return res.status(200).json({
      message: "Slack channel saved successfully.",
      integration,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to save Slack channel.",
    });
  }
};

export const sendTestSlackMessage = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "slack",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "Slack is not connected.",
      });
    }

    if (!integration.slackChannelId) {
      return res.status(400).json({
        message: "Please select a Slack notification channel first.",
      });
    }

    await sendSlackMessage(
      req.user.organization._id,
      integration.slackChannelId,
      "WorkComposer Slack integration is working successfully!",
    );

    return res.status(200).json({
      message: "Test message sent successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to send test message.",
    });
  }
};

export const updateSlackNotifications = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "slack",
    });

    if (!integration) {
      return res.status(404).json({
        message: "Slack integration not found",
      });
    }

    integration.notifications = {
      ...integration.notifications,
      ...req.body,
    };

    await integration.save();

    res.json({
      success: true,
      notifications: integration.notifications,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const handleSlackInteraction = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);

    const action = payload.actions?.[0];

    if (!action) {
      return res.sendStatus(200);
    }

    if (action.action_id === "open_task") {
      const taskId = action.value;

      return res.json({
        response_action: "open_link",
        url: `${process.env.FRONTEND_URL}/dashboard/task-management?task=${taskId}`,
      });
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

import mongoose from "mongoose";

const integrationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    provider: {
      type: String,
      enum: ["jira", "asana", "slack", "keka", "bamboohr", "storage"],
      required: true,
    },

    apiKey: {
      type: String,
    },

    subdomain: {
      type: String,
    },

    connected: {
      type: Boolean,
      default: false,
    },

    accessToken: {
      type: String,
    },

    refreshToken: {
      type: String,
    },

    expiresAt: {
      type: Date,
    },

    cloudId: String,

    clientSecret: String,

    siteUrl: String,

    workspaceName: String,

    accountId: {
      type: String,
    },

    workspaceId: {
      type: String,
    },

    workspaceName: {
      type: String,
    },

    slackChannelId: {
      type: String,
    },

    slackChannelName: {
      type: String,
    },

    notifications: {
      taskAssigned: {
        type: Boolean,
        default: true,
      },
      taskUpdated: {
        type: Boolean,
        default: true,
      },
      taskReassigned: {
        type: Boolean,
        default: true,
      },
      taskCompleted: {
        type: Boolean,
        default: true,
      },
      dailySummary: {
        type: Boolean,
        default: true,
      },
      weeklySummary: {
        type: Boolean,
        default: true,
      },
      reportReady: {
        type: Boolean,
        default: true,
      },
    },

    lastDailySummarySent: {
      type: Date,
      default: null,
    },

    lastWeeklySummarySent: {
      type: Date,
      default: null,
    },

    userId: {
      type: String,
    },

    email: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Integration", integrationSchema);

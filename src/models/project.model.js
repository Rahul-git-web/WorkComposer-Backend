import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    jiraProjectId: {
      type: String,
    },

    jiraProjectKey: {
      type: String,
    },

    asanaProjectId: {
      type: String,
    },

    asanaWebhookId: {
      type: String,
    },

    provider: {
      type: String,
      enum: ["workcomposer", "jira", "asana"],
      default: "workcomposer",
    },

    teams: [
      {
        type: String,
      },
    ],

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const Project = mongoose.model("Project", projectSchema);

export default Project;

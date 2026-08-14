import axios from "axios";
import Integration from "../models/integration.model.js";

export const sendSlackMessage = async (
  organizationId,
  channel,
  text,
  blocks = null,
) => {
  try {
    const integration = await Integration.findOne({
      organization: organizationId,
      provider: "slack",
      connected: true,
    });

    if (!integration) {
      throw new Error("Slack is not connected.");
    }

    const { data } = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel,
        text,
        ...(blocks && { blocks }),
      },
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!data.ok) {
      throw new Error(data.error);
    }

    return data;
  } catch (err) {
    console.error("[Slack Error]");
    console.error(err.response?.data || err.message);
    throw err;
  }
};

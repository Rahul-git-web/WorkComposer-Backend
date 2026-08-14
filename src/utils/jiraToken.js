import axios from "axios";

export const refreshJiraToken = async (integration) => {
  const { data } = await axios.post("https://auth.atlassian.com/oauth/token", {
    grant_type: "refresh_token",
    client_id: process.env.JIRA_CLIENT_ID,
    client_secret: process.env.JIRA_CLIENT_SECRET,
    refresh_token: integration.refreshToken,
  });

  integration.accessToken = data.access_token;

  if (data.refresh_token) {
    integration.refreshToken = data.refresh_token;
  }

  integration.expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await integration.save();

  return integration;
};

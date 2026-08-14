import axios from "axios";

export const refreshAsanaToken = async (integration) => {
  const params = new URLSearchParams();

  params.append("grant_type", "refresh_token");
  params.append("refresh_token", integration.refreshToken);
  params.append("client_id", process.env.ASANA_CLIENT_ID);
  params.append("client_secret", process.env.ASANA_CLIENT_SECRET);

  const { data } = await axios.post(
    "https://app.asana.com/-/oauth_token",
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  integration.accessToken = data.access_token;
  integration.refreshToken = data.refresh_token;
  integration.expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await integration.save();

  return integration;
};

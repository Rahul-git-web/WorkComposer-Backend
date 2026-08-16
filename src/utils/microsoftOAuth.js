const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT_ID || "common";
const MICROSOFT_SCOPES = "openid profile email User.Read";

export const getMicrosoftAuthUrl = (state = "web") => {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: MICROSOFT_SCOPES,
    prompt: "select_account",
    state,
  });

  return `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params.toString()}`;
};

export const getMicrosoftUser = async (code) => {
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        scope: MICROSOFT_SCOPES,
      }),
    },
  );

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    const err = new Error("Microsoft token exchange failed");
    err.details = tokenData;
    throw err;
  }

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    const err = new Error("Microsoft profile fetch failed");
    err.details = await profileRes.json().catch(() => ({}));
    throw err;
  }

  const profile = await profileRes.json();

  return {
    id: profile.id,
    email: profile.mail || profile.userPrincipalName || "",
    given_name: profile.givenName || "",
    family_name: profile.surname || "",
    name: profile.displayName || "",
  };
};
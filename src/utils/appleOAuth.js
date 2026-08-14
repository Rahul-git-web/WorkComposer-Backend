import jwt from "jsonwebtoken";

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_SCOPES = "name email";

// Apple's "client secret" is a short-lived JWT you sign yourself,
// using the private key downloaded from Apple Developer.
const generateAppleClientSecret = () => {
  const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  return jwt.sign(
    {
      iss: process.env.APPLE_TEAM_ID,
      aud: "https://appleid.apple.com",
      sub: process.env.APPLE_CLIENT_ID,
    },
    privateKey,
    {
      algorithm: "ES256",
      expiresIn: "5m",
      keyid: process.env.APPLE_KEY_ID,
    },
  );
};

export const getAppleAuthUrl = (state = "web") => {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    redirect_uri: process.env.APPLE_REDIRECT_URI,
    response_type: "code",
    scope: APPLE_SCOPES,
    response_mode: "form_post",
    state,
  });

  return `${APPLE_AUTH_URL}?${params.toString()}`;
};

export const getAppleUser = async (code) => {
  const clientSecret = generateAppleClientSecret();

  const tokenRes = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.APPLE_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.id_token) {
    const err = new Error("Apple token exchange failed");
    err.details = tokenData;
    throw err;
  }

  // Apple's user identity comes from the id_token itself (a JWT),
  // not a separate profile endpoint like Google/Microsoft.
  const decoded = jwt.decode(tokenData.id_token);

  return {
    id: decoded.sub,
    email: decoded.email || "",
    emailVerified: decoded.email_verified === "true" || decoded.email_verified === true,
  };
};
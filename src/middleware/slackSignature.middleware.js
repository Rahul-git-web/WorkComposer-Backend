import crypto from "crypto";

export const verifySlackSignature = (req, res, next) => {
  const timestamp = req.headers["x-slack-request-timestamp"];
  const slackSignature = req.headers["x-slack-signature"];

  if (!timestamp || !slackSignature) {
    return res.status(400).send("Missing Slack signature headers");
  }

  const fiveMinutes = 60 * 5;

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > fiveMinutes) {
    return res.status(400).send("Slack request timestamp too old");
  }

  const sigBasestring = `v0:${timestamp}:${req.rawBody}`;

  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
      .update(sigBasestring)
      .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(slackSignature),
  );

  if (!valid) {
    return res.status(400).send("Invalid Slack signature");
  }

  next();
};
import crypto from "crypto";

export const generateApiKey = () => {
  const random = crypto.randomBytes(32).toString("hex");

  return `wc_${random}`;
};

import crypto from "node:crypto";
import User from "../models/User.model.js";

const generateReferralCode = async () => {
  const referralCode = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  const exists = await User.exists({ referralCode });

  if (exists) {
    return generateReferralCode();
  }

  return referralCode;
};

const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
export {generateReferralCode, generateRandomToken, hashToken}





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


export {generateReferralCode}




import User from "../models/User.model.js";
import ReferralIncome from "../models/Referrel.model.js";
import { errorMessage, successMessage } from "../utils/Message.js";


const buildReferralTree = async (parentId, currentDepth = 1, maxDepth = 5) => {
  if (currentDepth > maxDepth) return [];

  const downlines = await User.find({ referredBy: parentId })
    .select("fullName email referralCode accountStatus createdAt")
    .lean();

  const branch = [];
  for (const child of downlines) {
    const children = await buildReferralTree(child._id, currentDepth + 1, maxDepth);
    branch.push({
      ...child,
      level: currentDepth,
      referrals: children,
    });
  }

  return branch;
};


const getDirectReferrals = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const directReferrals = await User.find({ referredBy: userId })
      .select("fullName email mobileNumber referralCode accountStatus createdAt")
      .sort({ createdAt: -1 });

    return successMessage(res, 200, "Direct referrals fetched successfully.", {
      count: directReferrals.length,
      referrals: directReferrals,
    });
  } catch (error) {
    console.error("Get Direct Referrals Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while fetching direct referrals."
    );
  }
};


const getReferralTree = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const tree = await buildReferralTree(userId);

    return successMessage(res, 200, "Referral tree fetched successfully.", {
      tree,
    });
  } catch (error) {
    console.error("Get Referral Tree Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching referral tree.");
  }
};


const getReferralIncomeHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const history = await ReferralIncome.find({ recipient: userId })
      .populate("generator", "fullName email referralCode")
      .populate("investment", "investmentAmount planDetails")
      .sort({ createdAt: -1 });

    return successMessage(res, 200, "Referral income history fetched successfully.", { count: history.length, history });
  } catch (error) {
    console.error("Get Referral Income History Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching referral income history.");
  }
};

export { getDirectReferrals, getReferralTree, getReferralIncomeHistory };
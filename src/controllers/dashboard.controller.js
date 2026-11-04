import Investment from "../models/Investment.model.js";
import RoiHistory from "../models/RoiHistory.model.js";
import User from "../models/User.model.js";
import { errorMessage, successMessage } from "../utils/Message.js";



const getDashboardStats = async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    const user = await User.findById(userObjectId).select(
      "walletBalance totalRoiEarned totalLevelIncomeEarned"
    );

    if (!user) {
      return errorMessage(res, 404, "User not found.");
    }

    // Run aggregations in parallel
    const [investmentStats, roiStats] = await Promise.all([
      // Total Invested
      Investment.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: null,
            totalInvested: { $sum: "$investmentAmount" },
          },
        },
      ]),

      // Total ROI Earned from credited records
      RoiHistory.aggregate([
        { $match: { user: userObjectId, status: "credited" } },
        {
          $group: {
            _id: null,
            totalRoi: { $sum: "$roiAmount" },
          },
        },
      ]),
    ]);

    const totalInvestments =
      investmentStats.length > 0 ? investmentStats[0].totalInvested : 0;
    const totalRoiEarned = roiStats.length > 0 ? roiStats[0].totalRoi : 0;

    return successMessage(res, 200, "Dashboard stats fetched successfully.", {
      stats: {
        totalInvestments,
        totalRoiEarned, // Computed live from RoiHistory!
        totalLevelIncomeEarned: user.totalLevelIncomeEarned || 0,
        walletBalance: user.walletBalance || 0,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while fetching dashboard stats."
    );
  }
};


const getRoiHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const roiRecords = await RoiHistory.find({ user: userId })
      .populate("investment", "investmentAmount planDetails dailyRoiPercentage")
      .sort({ createdAt: -1 });

    return successMessage(res, 200, "ROI history fetched successfully.", {
      count: roiRecords.length,
      roiHistory: roiRecords,
    });
  } catch (error) {
    console.error("Get ROI History Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching ROI history.");
  }
};

export { getDashboardStats, getRoiHistory };
import Investment from "../models/Investment.model.js";
import RoiHistory from "../models/RoiHistory.model.js";
import User from "../models/User.model.js";
import { errorMessage, successMessage } from "../utils/Message.js";



const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;


    const user = await User.findById(userId).select("walletBalance totalRoiEarned totalLevelIncomeEarned");

    if (!user) {
      return errorMessage(res, 404, "User not found.");
    }

    const investmentStats = await Investment.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalInvested: { $sum: "$investmentAmount" },
        },
      },
    ]);

    const totalInvestments = investmentStats.length > 0 ? investmentStats[0].totalInvested : 0;

    return successMessage(res, 200, "Dashboard stats fetched successfully.", {
      stats: {
        totalInvestments,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching dashboard stats.");
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
import Investment from "../models/Investment.model.js";
import { errorMessage, successMessage } from "../utils/Message.js";
import { distributeLevelIncome } from "../utils/referralHelper.js";

const createInvestment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { investmentAmount, planName, durationDays, dailyRoiPercentage } = req.body ?? {};


    if (investmentAmount === undefined || !planName || !durationDays || dailyRoiPercentage === undefined) {
      return errorMessage(res, 400, "Investment amount, plan name, duration (days), and daily ROI percentage are required.");
    }

    const numericAmount = Number(investmentAmount);
    const numericDays = Number(durationDays);
    const numericRoi = Number(dailyRoiPercentage);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return errorMessage( res, 400, "Investment amount must be a valid positive number.");
    }

    if (isNaN(numericDays) || numericDays <= 0 || !Number.isInteger(numericDays)) {
      return errorMessage(res, 400, "Duration days must be a positive whole number.");
    }

    if (isNaN(numericRoi) || numericRoi < 0) {
      return errorMessage(res, 400, "Daily ROI percentage must be a non-negative number.");
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + numericDays);

    const newInvestment = await Investment.create({
      user: userId,
      investmentAmount: numericAmount,
      planDetails: {
        planName: planName.trim(),
        durationDays: numericDays,
      },
      startDate,
      endDate,
      dailyRoiPercentage: numericRoi,
      investmentStatus: "Active",
    });

    await distributeLevelIncome(userId, numericAmount, newInvestment._id);

    return successMessage(res, 201, "Investment created successfully.", { investment: newInvestment });
  } catch (error) {
    console.error("Create Investment Error:", error);
    return errorMessage(res, 500, "Something went wrong while creating the investment.");
  }
};


const getUserInvestments = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const investments = await Investment.find({ user: userId }).sort({ createdAt: -1 });

    return successMessage( res, 200, "Investments fetched successfully.", { count: investments.length, investments });
  } catch (error) {
    console.error("Get User Investments Error:", error);
    return errorMessage( res, 500, "Something went wrong while fetching your investments.");
  }
};

export { createInvestment, getUserInvestments };
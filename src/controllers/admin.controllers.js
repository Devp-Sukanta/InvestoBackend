import { errorMessage, successMessage } from "../utils/Message.js";
import { processDailyRoi, sanitizeCsvCell } from "../utils/referralHelper.js";
import RoiHistory from "../models/RoiHistory.model.js";
import ReferralIncome from "../models/Referrel.model.js";
import Investment from "../models/Investment.model.js";
import User from "../models/User.model.js";
import { comparePassword } from "../utils/hashing.js";
import { generateJWT } from "../utils/jwthelper.js";


const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return errorMessage(res, 400, "Email and password are required.");
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail }).select("+password");

    if (!user) {
      return errorMessage(res, 401, "Invalid administrator credentials.");
    }

    if (user.role !== "admin") {
      return errorMessage(
        res,
        403,
        "Access denied. Unauthorized administrative attempt."
      );
    }

    if (user.accountStatus !== "active") {
      return errorMessage(
        res,
        403,
        "Administrative account is suspended or inactive."
      );
    }


    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) {
      return errorMessage(res, 401, "Invalid administrator credentials.");
    }


   const token = await generateJWT(user._id);;

    return successMessage(res, 200, "Admin authenticated successfully.", {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return errorMessage(res, 500, "Failed to authenticate administrator.");
  }
};

const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalInvestedAgg,
      totalRoiAgg,
      totalRefAgg,
      activeInvestments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: "active" }),
      Investment.aggregate([
        { $group: { _id: null, total: { $sum: "$investmentAmount" } } },
      ]),
      RoiHistory.aggregate([
        { $match: { status: "Credited" } },
        { $group: { _id: null, total: { $sum: "$roiAmount" } } },
      ]),
      ReferralIncome.aggregate([
        { $group: { _id: null, total: { $sum: "$incomeAmount" } } },
      ]),
      Investment.countDocuments({ investmentStatus: "Active" }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalPlatformInvestments: totalInvestedAgg[0]?.total || 0,
      totalRoiDistributed: totalRoiAgg[0]?.total || 0,
      totalReferralIncomeDistributed: totalRefAgg[0]?.total || 0,
      activeInvestmentsCount: activeInvestments,
    };

    return successMessage(res, 200, "System statistics fetched successfully.", {
      stats,
    });
  } catch (error) {
    console.error("Admin Get Stats Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while fetching platform statistics.",
    );
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 15);
    const search = req.query.search?.trim();

    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { referralCode: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("referredBy", "fullName email referralCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successMessage(res, 200, "Users fetched successfully.", {
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      users,
    });
  } catch (error) {
    console.error("Admin Get Users Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching users.");
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    const allowedStatuses = ["active", "inactive", "suspended", "deleted"];
    if (!allowedStatuses.includes(accountStatus)) {
      return errorMessage(
        res,
        400,
        `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { accountStatus },
      { new: true },
    );

    if (!updatedUser) {
      return errorMessage(res, 404, "User not found.");
    }

    return successMessage(res, 200, "User status updated successfully.", {
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin Update Status Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while updating user status.",
    );
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 15);

    const total = await Investment.countDocuments();
    const investments = await Investment.find()
      .populate("user", "fullName email referralCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successMessage(res, 200, "All investments fetched successfully.", {
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      investments,
    });
  } catch (error) {
    console.error("Admin Get Investments Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while fetching platform investments.",
    );
  }
};

const triggerManualRoiJob = async (req, res) => {
  try {
    console.log(`[Admin] Manual ROI triggered by admin: ${req.user.email}`);
    await processDailyRoi();

    return successMessage(
      res,
      200,
      "Daily ROI processing triggered and completed.",
    );
  } catch (error) {
    console.error("Admin Trigger ROI Error:", error);
    return errorMessage(res, 500, "Failed to run manual ROI distribution.");
  }
};

const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { investmentStatus, dailyRoiPercentage, planName, durationDays } =
      req.body;

    const investment = await Investment.findById(id);
    if (!investment) {
      return errorMessage(res, 404, "Investment record not found.");
    }

    if (investmentStatus) investment.investmentStatus = investmentStatus;
    if (dailyRoiPercentage !== undefined)
      investment.dailyRoiPercentage = Number(dailyRoiPercentage);
    if (planName) investment.planDetails.planName = planName;
    if (durationDays)
      investment.planDetails.durationDays = Number(durationDays);

    await investment.save();

    return successMessage(res, 200, "Investment updated successfully.", {
      investment,
    });
  } catch (error) {
    console.error("Admin Update Investment Error:", error);
    return errorMessage(res, 500, "Failed to update investment.");
  }
};

const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Investment.findByIdAndDelete(id);

    if (!deleted) {
      return errorMessage(res, 404, "Investment record not found.");
    }

    return successMessage(res, 200, "Investment record deleted successfully.");
  } catch (error) {
    console.error("Admin Delete Investment Error:", error);
    return errorMessage(res, 500, "Failed to delete investment.");
  }
};

const deleteRoiRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const roiRecord = await RoiHistory.findById(id);

    if (!roiRecord) {
      return errorMessage(res, 404, "ROI record not found.");
    }

    if (roiRecord.status === "Credited") {
      await User.findByIdAndUpdate(roiRecord.user, {
        $inc: {
          walletBalance: -roiRecord.roiAmount,
          totalRoiEarned: -roiRecord.roiAmount,
        },
      });
    }

    await RoiHistory.findByIdAndDelete(id);

    return successMessage(res, 200, "ROI record deleted and balance adjusted.");
  } catch (error) {
    console.error("Admin Delete ROI Error:", error);
    return errorMessage(res, 500, "Failed to delete ROI record.");
  }
};

const deleteReferralIncomeRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const refRecord = await ReferralIncome.findById(id);

    if (!refRecord) {
      return errorMessage(res, 404, "Referral income record not found.");
    }

    await User.findByIdAndUpdate(refRecord.recipient, {
      $inc: {
        walletBalance: -refRecord.incomeAmount,
        totalLevelIncomeEarned: -refRecord.incomeAmount,
      },
    });

    await ReferralIncome.findByIdAndDelete(id);

    return successMessage(
      res,
      200,
      "Referral income record deleted and balance adjusted.",
    );
  } catch (error) {
    console.error("Admin Delete Referral Income Error:", error);
    return errorMessage(res, 500, "Failed to delete referral income record.");
  }
};

const adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {fullName, email, mobileNumber, password, role, accountStatus} = req.body ?? {};

    const user = await User.findById(id);
    if (!user) {
      return errorMessage(res, 404, "User not found.");
    }

    
    if (accountStatus && accountStatus !== user.accountStatus) {
      const allowedStatuses = ["active", "inactive", "suspended", "deleted"];
      if (!allowedStatuses.includes(accountStatus)) {
        return errorMessage(
          res,
          400,
          `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        );
      }

      if (accountStatus !== "active") {
        const activeInvestmentsCount = await Investment.countDocuments({
          user: id,
          investmentStatus: "Active",
        });

        if (activeInvestmentsCount > 0) {
          return errorMessage(
            res,
            400,
            `Cannot set user status to '${accountStatus}'. The user currently has ${activeInvestmentsCount} active investment(s). Cancel or complete them first.`
          );
        }
      }

      user.accountStatus = accountStatus;
    }


    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return errorMessage(res, 400, "Full name cannot be empty.");
      }
      user.fullName = fullName.trim();
    }


    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = email.trim().toLowerCase();

      if (!emailRegex.test(cleanEmail)) {
        return errorMessage(res, 400, "Please provide a valid email address.");
      }

      if (cleanEmail !== user.email) {
        const existingEmail = await User.findOne({
          email: cleanEmail,
          _id: { $ne: id },
        });
        if (existingEmail) {
          return errorMessage(res, 409, "Email is already taken by another account.");
        }
        user.email = cleanEmail;
      }
    }

    
    if (mobileNumber !== undefined) {
      const cleanMobile = mobileNumber ? mobileNumber.trim() : null;
      if (cleanMobile) {
        const existingMobile = await User.findOne({
          mobileNumber: cleanMobile,
          _id: { $ne: id },
        });
        if (existingMobile) {
          return errorMessage(res, 409, "Mobile number is already taken by another account.");
        }
      }
      user.mobileNumber = cleanMobile;
    }

   
    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return errorMessage(res, 400, "Password must be at least 8 characters long.");
      }
      user.password = await hashPassword(password);
    }

    await user.save();

    return successMessage(res, 200, "User updated successfully by admin.", {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        accountStatus: user.accountStatus,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error("Admin Update User Error:", error);
    return errorMessage(res, 500, "Something went wrong while updating user.");
  }
};


const getAllRoi = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      RoiHistory.countDocuments(),
      RoiHistory.find()
        .populate("user", "fullName email")
        .populate("investment", "investmentAmount planDetails")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return successMessage(res, 200, "ROI ledger fetched successfully.", {
      records,
      pagination: {
        page,
        pages: Math.ceil(total / limit) || 1,
        total,
      },
    });
  } catch (error) {
    console.error("Get ROI Ledger Error:", error);
    return errorMessage(res, 500, "Failed to retrieve ROI ledger records.");
  }
};


const getReferrals = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      ReferralIncome.countDocuments(),
      ReferralIncome.find()
        .populate("recipient", "fullName email")
        .populate("generator", "fullName email referralCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return successMessage(res, 200, "Referral ledger fetched successfully.", {
      records,
      pagination: {
        page,
        pages: Math.ceil(total / limit) || 1,
        total,
      },
    });
  } catch (error) {
    console.error("Get Referral Ledger Error:", error);
    return errorMessage(res, 500, "Failed to retrieve referral commission records.");
  }
};


const exportReportCsv = async (req, res) => {
  try {
    const { type } = req.params;
    let filename = `export_${type}_${Date.now()}.csv`;
    let headers = [];
    let rows = [];

    if (type === "users") {
      headers = ["ID", "Full Name", "Email", "Mobile", "Role", "Status", "Wallet Balance", "Referral Code", "Joined At"];
      const users = await User.find().sort({ createdAt: -1 }).lean();
      rows = users.map((u) => [
        u._id,
        u.fullName,
        u.email,
        u.mobileNumber || "N/A",
        u.role,
        u.accountStatus,
        u.walletBalance || 0,
        u.referralCode,
        new Date(u.createdAt).toISOString(),
      ]);
    } else if (type === "investments") {
      headers = ["ID", "User ID", "Plan Name", "Amount", "Daily ROI %", "Duration Days", "Status", "Start Date", "End Date"];
      const investments = await Investment.find().populate("user", "email").sort({ createdAt: -1 }).lean();
      rows = investments.map((inv) => [
        inv._id,
        inv.user?.email || inv.user || "N/A",
        inv.planDetails?.planName || "N/A",
        inv.investmentAmount,
        inv.dailyRoiPercentage,
        inv.planDetails?.durationDays || 0,
        inv.investmentStatus,
        new Date(inv.startDate).toISOString(),
        new Date(inv.endDate).toISOString(),
      ]);
    } else if (type === "roi") {
      headers = ["ID", "User ID", "Investment ID", "ROI Amount", "Date String", "Status", "Timestamp"];
      const rois = await RoiHistory.find().populate("user", "email").sort({ createdAt: -1 }).lean();
      rows = rois.map((r) => [
        r._id,
        r.user?.email || r.user || "N/A",
        r.investment || "N/A",
        r.roiAmount,
        r.dateString,
        r.status,
        new Date(r.createdAt || r.date).toISOString(),
      ]);
    } else if (type === "referrals") {
      headers = ["ID", "Beneficiary Email", "Downline Email", "Level", "Commission Amount", "Timestamp"];
      const refs = await ReferralIncome.find()
        .populate("beneficiary", "email")
        .populate("generator", "email")
        .sort({ createdAt: -1 })
        .lean();
      rows = refs.map((ref) => [
        ref._id,
        ref.beneficiary?.email || "N/A",
        ref.generator?.email || "N/A",
        ref.referralLevel,
        ref.incomeAmount,
        new Date(ref.createdAt || ref.date).toISOString(),
      ]);
    } else {
      return errorMessage(res, 400, "Invalid export report type.");
    }

    // Build CSV file content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(sanitizeCsvCell).join(",")),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export CSV Error:", error);
    return errorMessage(res, 500, "Failed to generate CSV export.");
  }
};


export {getSystemStats, getAllUsers, updateUserStatus, getAllInvestments,
    triggerManualRoiJob, updateInvestment, deleteInvestment, deleteRoiRecord,
    deleteReferralIncomeRecord, adminUpdateUser, adminLogin, getAllRoi, getReferrals,
    exportReportCsv
}

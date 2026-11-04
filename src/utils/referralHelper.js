import mongoose from "mongoose";
import User from "../models/User.model.js";
import ReferralIncome from "../models/Referrel.model.js";
import Investment from "../models/Investment.model.js";
import RoiHistory from "../models/RoiHistory.model.js";
import cron from 'node-cron'


const LEVEL_COMMISSION_RATES = {
  1: 0.05, 
  2: 0.03, 
  3: 0.02, 
  4: 0.01, 
  5: 0.005, 
};


const distributeLevelIncome = async (investorId, investmentAmount, investmentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let currentUserId = investorId;
    let currentLevel = 1;
    const maxLevels = Object.keys(LEVEL_COMMISSION_RATES).length;

    while (currentLevel <= maxLevels) {
    
      const currentUser = await User.findById(currentUserId).session(session);
      if (!currentUser || !currentUser.referredBy) {
        break; 
      }

      const sponsor = await User.findById(currentUser.referredBy).session(session);
      if (!sponsor) {
        break;
      }


      if (sponsor.accountStatus === "active") {
        const rate = LEVEL_COMMISSION_RATES[currentLevel] || 0;
        const commission = Math.round(investmentAmount * rate * 100) / 100;

        if (commission > 0) {
          await ReferralIncome.create(
            [
              {
                recipient: sponsor._id,
                generator: investorId,
                investment: investmentId,
                referralLevel: currentLevel,
                incomeAmount: commission,
                date: new Date(),
              },
            ],
            { session }
          );

          await User.findByIdAndUpdate(
            sponsor._id,
            {
              $inc: {
                walletBalance: commission,
                totalLevelIncomeEarned: commission,
              },
            },
            { session }
          );
        }
      }

      currentUserId = sponsor._id;
      currentLevel++;
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error distributing level income:", error);
    throw error;
  }
};



const processDailyRoi = async () => {
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];

  console.log(`processing daily ROI for date: ${dateString}`);

  const activeInvestments = await Investment.find({
    investmentStatus: "Active",
  });

  let processedCount = 0;
  let skippedCount = 0;
  let completedCount = 0;

  for (const inv of activeInvestments) {
    try {
      
      if (today > new Date(inv.endDate)) {
        inv.investmentStatus = "Completed";
        await inv.save();
        completedCount++;
        continue;
      }

      const alreadyProcessed = await RoiHistory.findOne({
        investment: inv._id,
        dateString,
      });

      if (alreadyProcessed) {
        skippedCount++;
        continue;
      }

      const dailyAmount =
        Math.round(
          ((inv.investmentAmount * inv.dailyRoiPercentage) / 100) * 100
        ) / 100;

      if (dailyAmount <= 0) continue;

    
      await RoiHistory.create({
        user: inv.user,
        investment: inv._id,
        roiAmount: dailyAmount,
        dateString,
        date: new Date(),
        status: "Credited",
      });

      await User.findByIdAndUpdate(inv.user, {
        $inc: {
          walletBalance: dailyAmount,
          totalRoiEarned: dailyAmount,
        },
      });

      processedCount++;
    } catch (err) {
      if (err.code === 11000) {
        console.warn(`Duplicate record found for investment ${inv._id}`);
        skippedCount++;
      } else {
        console.error(`Failed processing investment return ${inv._id}:`, err);
      }
    }
  }

  console.log(
    `Roi Credited: ${processedCount}, Skipped: ${skippedCount}, Completed: ${completedCount}`
  );
};


const initScheduler = () => {

  cron.schedule("0 0 * * *", async () => {
    console.log("Triggering ROI calculation job...");
    try {
      await processDailyRoi();
    } catch (error) {
      console.error("ROI cron job execution failed:", error);
    }
  });

  console.log("ROI Cron Job initialized (0 0 * * *)");
};


const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};


export {distributeLevelIncome, processDailyRoi, initScheduler, sanitizeCsvCell}
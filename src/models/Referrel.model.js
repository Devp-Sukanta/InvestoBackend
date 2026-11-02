import mongoose from "mongoose";

const referralIncomeSchema = new mongoose.Schema(
  {

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient reference is required"],
      index: true,
    },

    generator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Generator reference is required"],
      index: true,
    },

    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
      default: null,
      index: true,
    },

    referralLevel: {
      type: Number,
      required: [true, "Referral level is required"],
      min: [1, "Referral level must be at least 1"],
    },

    incomeAmount: {
      type: Number,
      required: [true, "Income amount is required"],
      min: [0, "Income amount cannot be negative"],
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

referralIncomeSchema.index({ recipient: 1, createdAt: -1 });

const ReferralIncome = mongoose.model("ReferralIncome", referralIncomeSchema);

export default ReferralIncome;
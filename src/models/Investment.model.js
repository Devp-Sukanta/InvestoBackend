import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    investmentAmount: {
      type: Number,
      required: [true, "Investment amount is required"],
      min: [1, "Investment amount must be at least 1"],
    },

    planDetails: {
      planName: {
        type: String,
        required: [true, "Plan name is required"],
        trim: true,
      },
      durationDays: {
        type: Number,
        required: [true, "Plan duration in days is required"],
        min: [1, "Duration must be at least 1 day"],
      },
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    dailyRoiPercentage: {
      type: Number,
      required: [true, "Daily ROI percentage is required"],
      min: [0, "Daily ROI percentage cannot be negative"],
    },

    investmentStatus: {
      type: String,
      enum: ["Active", "Completed", "Cancelled"],
      default: "Active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


investmentSchema.index({ investmentStatus: 1, endDate: 1 });

const Investment = mongoose.model("Investment", investmentSchema);

export default Investment;
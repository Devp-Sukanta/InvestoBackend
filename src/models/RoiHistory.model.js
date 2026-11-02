import mongoose from "mongoose";

const roiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
      required: [true, "Investment reference is required"],
      index: true,
    },

    roiAmount: {
      type: Number,
      required: [true, "ROI amount is required"],
      min: [0, "ROI amount cannot be negative"],
    },

    date: {
      type: Date,
      default: Date.now,
    },

    dateString: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["Credited", "Failed", "Pending"],
      default: "Credited",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

roiHistorySchema.index({ investment: 1, dateString: 1 }, { unique: true });

const RoiHistory = mongoose.model("RoiHistory", roiHistorySchema);

export default RoiHistory;
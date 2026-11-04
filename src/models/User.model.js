import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobileNumber: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    
    resetPasswordExpire: {
      type: Date,
      default: null,
      select: false,
    },

    referralCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalRoiEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalLevelIncomeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended", "deleted"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const User = mongoose.model("User", userSchema);

export default User;

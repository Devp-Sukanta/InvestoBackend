import User from "../models/User.model.js";
import { comparePassword, hashPassword } from "../utils/hashing.js";
import { generateJWT } from "../utils/jwthelper.js";
import { errorMessage, successMessage } from "../utils/Message.js";
import { generateReferralCode } from "../utils/userHelper.js";

const registerUser = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, referredByCode } =  req.body ?? {};


    if (!fullName || !email || !password) {
      return errorMessage(res, 400, "Full name, email, and password are required.");
    }

    if (typeof fullName !== "string" || !fullName.trim()) {
      return errorMessage(res, 400, "Please provide a valid full name.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (typeof email !== "string" || !emailRegex.test(email.trim())) {
      return errorMessage(res, 400, "Please provide a valid email address.");
    }

    if (typeof password !== "string" || password.length < 8) {
      return errorMessage(res, 400, "Password must be at least 8 characters long.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return errorMessage(res, 409, "An account with this email already exists.");
    }

    let referredBy = null;

    if (referredByCode) {
      if (typeof referredByCode !== "string" || !referredByCode.trim()) {
        return errorMessage(res, 400, "Invalid referral code format.");
      }

      const referrer = await User.findOne({
        referralCode: referredByCode.trim().toUpperCase(),
      }).select("_id accountStatus");

      if (!referrer) {
        return errorMessage(res, 400, "Invalid referral code. Referrer not found.");
      }

      if (referrer.accountStatus !== "active") {
        return errorMessage(res, 400, "Referrer account is not active.");
      }

      referredBy = referrer._id;
    }


    const hashedPassword = await hashPassword(password);
    const referralCode = await generateReferralCode();


    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobileNumber: mobileNumber?.trim() || null,
      password: hashedPassword,
      referralCode,
      referredBy,
    });

    const token = await generateJWT(newUser?._id);

    return successMessage(res, 201, "User registered successfully.",{token});
  } catch (error) {
    console.error("Register User Error:", error);
    return errorMessage(res, 500, "Something went wrong while registering the user.");
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return errorMessage(res, 400, "Email and password are required.");
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return errorMessage(res, 400, "Invalid login credentials.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return errorMessage(res, 400, "Please provide a valid email address.");
    }


    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return errorMessage(res, 401, "Invalid email or password.");
    }


    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return errorMessage(res, 401, "Invalid email or password.");
    }

    if (user.accountStatus !== "active") {
      return errorMessage(res, 403, "Your account is not active.");
    }

    const token = await generateJWT(user._id);

    return successMessage(res, 200, "Login successful.", {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
      },
    });
  } catch (error) {
    console.error("Login User Error:", error);
    return errorMessage(res, 500, "Something went wrong while logging in.");
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return errorMessage(res, 404, "User not found.");
    }

    if (user.accountStatus !== "active") {
      return errorMessage(res, 403, "Your account is not active.");
    }

    return successMessage(res, 200, "Profile fetched successfully.", { user });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return errorMessage(res, 500, "Something went wrong while fetching profile." );
  }
};

export { registerUser, loginUser, getMe };
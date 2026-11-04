import User from "../models/User.model.js";
import { comparePassword, hashPassword } from "../utils/hashing.js";
import { generateJWT } from "../utils/jwthelper.js";
import { errorMessage, successMessage } from "../utils/Message.js";
import { generateRandomToken, generateReferralCode, hashToken } from "../utils/userHelper.js";

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

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { fullName, email, mobileNumber, currentPassword, newPassword } =
      req.body ?? {};

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return errorMessage(res, 404, "User not found.");
    }

 
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return errorMessage(res, 400, "Full name cannot be empty.");
      }
      user.fullName = fullName.trim();
    }

 
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        return errorMessage(res, 400, "Please provide a valid email address.");
      }


      if (user.email && user.email !== cleanEmail) {
        return errorMessage(
          res,
          400,
          "Email address is permanently linked and cannot be changed."
        );
      }

      
      if (!user.email) {
        const emailExists = await User.findOne({
          email: cleanEmail,
          _id: { $ne: userId },
        });
        if (emailExists) {
          return errorMessage(
            res,
            409,
            "This email is already associated with another account."
          );
        }
        user.email = cleanEmail;
      }
    }

    
    if (mobileNumber !== undefined) {
      const cleanMobile = mobileNumber ? mobileNumber.trim() : null;

      if (cleanMobile && cleanMobile !== user.mobileNumber) {
        const mobileExists = await User.findOne({
          mobileNumber: cleanMobile,
          _id: { $ne: userId },
        });

        if (mobileExists) {
          return errorMessage(
            res,
            409,
            "This mobile number is already in use by another account."
          );
        }
      }

      user.mobileNumber = cleanMobile;
    }


    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return errorMessage(
          res,
          400,
          "New password must be at least 8 characters long."
        );
      }

      if (user.password) {
        if (!currentPassword) {
          return errorMessage(
            res,
            400,
            "Current password is required to set a new password."
          );
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
          return errorMessage(res, 400, "Current password does not match.");
        }
      }

      user.password = await hashPassword(newPassword);
    }

    await user.save();

    return successMessage(res, 200, "Profile updated successfully.", {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        referralCode: user.referralCode,
        walletBalance: user.walletBalance,
        totalRoiEarned: user.totalRoiEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return errorMessage(
      res,
      500,
      "Something went wrong while updating your profile."
    );
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (!email || typeof email !== "string") {
      return errorMessage(res, 400, "Please provide a valid email address.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return errorMessage(res, 404, "No account found with that email address.");
    }

    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    return successMessage(
      res,
      200,
      "Password reset token generated. Valid for 15 minutes.",
      {
        resetToken,
        expiresIn: "15 minutes",
      }
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return errorMessage(res, 500, "Failed to process forgot password request.");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body ?? {};

    if (!token) {
      return errorMessage(res, 400, "Password reset token is required.");
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return errorMessage(res, 400, "New password must be at least 8 characters long.");
    }


    const hashedToken = hashToken(token);


    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      return errorMessage(res, 400, "Invalid or expired reset token.");
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    return successMessage(res, 200, "Password reset successfully. You can now log in.");
  } catch (error) {
    console.error("Reset Password Error:", error);
    return errorMessage(res, 500, "Failed to reset password.");
  }
};
export { registerUser, loginUser, getMe, updateProfile, forgotPassword, resetPassword };
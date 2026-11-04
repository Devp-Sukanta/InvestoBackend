
import express from "express";
import { forgotPassword, getMe, loginUser, registerUser, resetPassword, updateProfile } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/authMiddleWare.js";


const router = express.Router();


router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/me").get(authMiddleware(["user", "admin"]), getMe);
router.route("/update-profile").put(authMiddleware(["user", "admin"]), updateProfile);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

export default router;

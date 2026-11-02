
import express from "express";
import { getMe, loginUser, registerUser } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/authMiddleWare.js";


const router = express.Router();


router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/me").get(authMiddleware(["user"]), getMe)

export default router;

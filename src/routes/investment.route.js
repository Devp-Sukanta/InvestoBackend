import express from "express";
import authMiddleware from "../middlewares/authMiddleWare.js";
import { createInvestment, getUserInvestments } from "../controllers/investment.controller.js";

const router = express.Router();

router.route("/create").post(authMiddleware(["user"]), createInvestment);
router.route("/my").get(authMiddleware(["user"]), getUserInvestments);

export default router;
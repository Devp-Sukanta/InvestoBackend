import express from "express";
import authMiddleware from "../middlewares/authMiddleWare.js";
import { getDirectReferrals, getReferralIncomeHistory, getReferralTree } from "../controllers/referrel.controller.js";

const router = express.Router();

router.route("/direct").get(authMiddleware(["user"]), getDirectReferrals);
router.route("/tree").get(authMiddleware(["user"]), getReferralTree);
router.route("/income-history").get(authMiddleware(["user"]), getReferralIncomeHistory);

export default router;
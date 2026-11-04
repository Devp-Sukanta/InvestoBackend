import express from "express";
import authMiddleware from "../middlewares/authMiddleWare.js";
import { cancelInvestment, createInvestment, getUserInvestments } from "../controllers/investment.controller.js";

const router = express.Router();

router.route("/create").post(authMiddleware(["user"]), createInvestment);
router.route("/my").get(authMiddleware(["user"]), getUserInvestments);
router.route("/cancel/:id").patch(authMiddleware(["user"]), cancelInvestment);

export default router;
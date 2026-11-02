import express from "express";
import authMiddleware from "../middlewares/authMiddleWare.js";
import { getDashboardStats, getRoiHistory } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.route("/").get(authMiddleware(["user"]), getDashboardStats);
router.route("/roi-history").get(authMiddleware(["user"]), getRoiHistory);

export default router;
import express from "express";
import { adminLogin, adminUpdateUser, deleteInvestment, deleteReferralIncomeRecord, deleteRoiRecord, exportReportCsv, getAllInvestments, getAllRoi, getAllUsers, getReferrals, getSystemStats, triggerManualRoiJob, updateInvestment } from "../controllers/admin.controllers.js";
import authMiddleware from "../middlewares/authMiddleWare.js";

const router = express.Router();

router.route("/login").post(adminLogin);
router.route("/stats").get(authMiddleware(["admin"]), getSystemStats);
router.route("/users").get(authMiddleware(["admin"]), getAllUsers);
router.route("/users/:id").put(authMiddleware(["admin"]), adminUpdateUser);
router.route("/investments").get(authMiddleware(["admin"]), getAllInvestments);
router.route("/update-investment/:id").put(authMiddleware(["admin"]), updateInvestment)
router.route("/delete-investment/:id").delete(authMiddleware(["admin"]), deleteInvestment);
router.route("/roi").get(authMiddleware(["admin"]), getAllRoi);
router.route("/referrals").get(authMiddleware(["admin"]), getReferrals);
router.route("/roi/:id").delete(authMiddleware(["admin"]), deleteRoiRecord);
router.route("/referral-income/:id").delete(authMiddleware(["admin"]), deleteReferralIncomeRecord);
router.route("/trigger-roi").post(authMiddleware(["admin"]), triggerManualRoiJob);
router.route("/reports/export/:type").get(authMiddleware(["admin"]), exportReportCsv);

export default router;
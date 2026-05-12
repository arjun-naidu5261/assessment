import { Router } from "express";
import { AnswerSheetToken } from "../models/AnswerSheetToken.js";
import { Assessment } from "../models/Assessment.js";
import { User } from "../models/User.js";

export const publicRouter = Router();

publicRouter.get("/sheet-token/:token", async (req, res, next) => {
  try {
    const row = await AnswerSheetToken.findOne({ token: req.params.token }).lean();
    if (!row) return res.status(404).json({ message: "Invalid or unknown sheet code" });
    const [assessment, student] = await Promise.all([
      Assessment.findById(row.assessmentId).select("title published deliveryMode").lean(),
      User.findById(row.studentId).select("name").lean(),
    ]);
    if (!assessment || !assessment.published) {
      return res.status(404).json({ message: "Assessment is not available" });
    }
    res.json({
      ok: true,
      assessmentTitle: assessment.title,
      deliveryMode: assessment.deliveryMode,
      studentName: student?.name || "",
    });
  } catch (e) {
    next(e);
  }
});

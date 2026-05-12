import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { ClassModel } from "../models/Class.js";
import { Assessment } from "../models/Assessment.js";
import { Question } from "../models/Question.js";
import { Submission } from "../models/Submission.js";
import { AnswerSheetToken } from "../models/AnswerSheetToken.js";
import { PaperCapture } from "../models/PaperCapture.js";
import { scoreAnswers } from "../lib/scoreSubmission.js";
import { analyzeScanImage } from "../lib/paperCvStub.js";
import { uploadPaperSingle } from "../middleware/uploadPaper.js";

export const studentRouter = Router();
studentRouter.use(authMiddleware, requireRole("student"));

studentRouter.post("/classes/join", async (req, res, next) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode || typeof joinCode !== "string") {
      return res.status(400).json({ message: "joinCode required" });
    }
    const code = joinCode.trim().toUpperCase();
    const cls = await ClassModel.findOne({ joinCode: code });
    if (!cls) return res.status(404).json({ message: "Invalid join code" });
    const sid = req.user.sub;
    if (cls.studentIds.some((id) => id.toString() === sid)) {
      return res.json({ class: serializeStudentClass(cls), alreadyMember: true });
    }
    cls.studentIds.push(sid);
    await cls.save();
    res.status(200).json({ class: serializeStudentClass(cls), alreadyMember: false });
  } catch (e) {
    next(e);
  }
});

studentRouter.get("/classes", async (req, res, next) => {
  try {
    const list = await ClassModel.find({ studentIds: req.user.sub })
      .select("name teacherId joinCode updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ classes: list.map(serializeStudentClass) });
  } catch (e) {
    next(e);
  }
});

studentRouter.post("/paper/upload", uploadPaperSingle.single("image"), async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "token required (from QR sheet)" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "image file required" });
    }
    const sheet = await AnswerSheetToken.findOne({ token: token.trim() }).lean();
    if (!sheet || sheet.studentId.toString() !== req.user.sub) {
      return res.status(403).json({ message: "This sheet does not belong to your account" });
    }
    const assessment = await Assessment.findOne({
      _id: sheet.assessmentId,
      published: true,
    }).lean();
    if (!assessment) {
      return res.status(404).json({ message: "Assessment not available" });
    }
    const mode = assessment.deliveryMode || "digital";
    if (mode === "digital") {
      return res.status(400).json({ message: "This quiz is online-only; use Take assessment" });
    }
    const dupSub = await Submission.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    });
    if (dupSub) {
      return res.status(409).json({ message: "You already have a score for this assessment" });
    }
    const pending = await PaperCapture.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
      status: { $ne: "graded" },
    });
    if (pending) {
      return res.status(409).json({ message: "A scan is already waiting for teacher review" });
    }
    const cv = await analyzeScanImage(req.file.path);
    const rel = `paper/${req.file.filename}`;
    const cap = await PaperCapture.create({
      assessmentId: assessment._id,
      studentId: req.user.sub,
      sheetToken: token.trim(),
      imagePath: rel,
      imageMime: req.file.mimetype,
      cvSuggestion: cv.suggestions || [],
      status: "needs_review",
      cvNotes: cv.note || "",
    });
    res.status(201).json({
      captureId: cap._id,
      status: cap.status,
      message: "Upload received. Your teacher will validate answers from the scan.",
    });
  } catch (e) {
    next(e);
  }
});

studentRouter.get("/assessments", async (req, res, next) => {
  try {
    const classes = await ClassModel.find({ studentIds: req.user.sub }).select("_id").lean();
    const classIds = classes.map((c) => c._id);
    const assessments = await Assessment.find({
      classId: { $in: classIds },
      published: true,
    })
      .sort({ updatedAt: -1 })
      .lean();
    const submissionIds = await Submission.find({
      studentId: req.user.sub,
      assessmentId: { $in: assessments.map((a) => a._id) },
    })
      .select("assessmentId score maxScore submittedAt source")
      .lean();
    const subMap = Object.fromEntries(
      submissionIds.map((s) => [
        s.assessmentId.toString(),
        {
          submitted: true,
          score: s.score,
          maxScore: s.maxScore,
          submittedAt: s.submittedAt,
          source: s.source || "digital",
        },
      ])
    );
    const out = await Promise.all(
      assessments.map(async (a) => {
        const cls = await ClassModel.findById(a.classId).select("name").lean();
        const key = a._id.toString();
        const mode = a.deliveryMode || "digital";
        const pendingPaper = await PaperCapture.findOne({
          assessmentId: a._id,
          studentId: req.user.sub,
          status: { $ne: "graded" },
        }).lean();
        return {
          id: a._id,
          title: a.title,
          classId: a.classId,
          className: cls?.name || "",
          questionCount: (a.questionIds || []).length,
          timeLimitMinutes: a.timeLimitMinutes,
          deliveryMode: mode,
          paperScanPending: Boolean(pendingPaper),
          submission: subMap[key] || { submitted: false },
        };
      })
    );
    res.json({ assessments: out });
  } catch (e) {
    next(e);
  }
});

studentRouter.get("/assessments/:id/paper-link", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      published: true,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cls = await ClassModel.findById(assessment.classId).lean();
    if (!cls || !cls.studentIds.some((id) => id.toString() === req.user.sub)) {
      return res.status(403).json({ message: "Not enrolled" });
    }
    const row = await AnswerSheetToken.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    }).lean();
    const base = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    if (!row) {
      return res.json({ uploadUrl: null, message: "Ask your teacher to generate answer sheets." });
    }
    res.json({
      uploadUrl: `${base}/student/paper-upload?token=${row.token}`,
    });
  } catch (e) {
    next(e);
  }
});

studentRouter.get("/assessments/:id", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      published: true,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cls = await ClassModel.findById(assessment.classId).lean();
    if (!cls || !cls.studentIds.some((id) => id.toString() === req.user.sub)) {
      return res.status(403).json({ message: "You are not enrolled in this class" });
    }
    const mode = assessment.deliveryMode || "digital";
    const existing = await Submission.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    }).lean();
    if (existing) {
      return res.json({
        assessment: {
          id: assessment._id,
          title: assessment.title,
          timeLimitMinutes: assessment.timeLimitMinutes,
          deliveryMode: mode,
          alreadySubmitted: true,
          result: {
            score: existing.score,
            maxScore: existing.maxScore,
            submittedAt: existing.submittedAt,
          },
        },
      });
    }
    const pendingPaper = await PaperCapture.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
      status: { $ne: "graded" },
    }).lean();

    if (mode === "paper") {
      const tok = await AnswerSheetToken.findOne({
        assessmentId: assessment._id,
        studentId: req.user.sub,
      }).lean();
      const base = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
      const paperUploadUrl = tok ? `${base}/student/paper-upload?token=${tok.token}` : null;
      return res.json({
        assessment: {
          id: assessment._id,
          title: assessment.title,
          timeLimitMinutes: assessment.timeLimitMinutes,
          deliveryMode: mode,
          alreadySubmitted: false,
          takeOnline: false,
          paperOnly: true,
          paperScanPending: Boolean(pendingPaper),
          paperUploadUrl,
          questions: [],
        },
      });
    }

    const tok = await AnswerSheetToken.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    }).lean();
    const base = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const paperUploadUrl = tok ? `${base}/student/paper-upload?token=${tok.token}` : null;

    const qs = await Question.find({ _id: { $in: assessment.questionIds || [] } }).lean();
    const order = (assessment.questionIds || []).map((id) => id.toString());
    const map = Object.fromEntries(qs.map((q) => [q._id.toString(), q]));
    const questions = order.map((id) => map[id]).filter(Boolean);
    res.json({
      assessment: {
        id: assessment._id,
        title: assessment.title,
        timeLimitMinutes: assessment.timeLimitMinutes,
        deliveryMode: mode,
        alreadySubmitted: false,
        takeOnline: true,
        paperAllowed: mode === "hybrid",
        paperScanPending: Boolean(pendingPaper),
        paperUploadUrl,
        questions: questions.map((q) => ({
          id: q._id,
          text: q.text,
          options: q.options,
          skill: q.skill,
          subject: q.subject,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

studentRouter.post("/assessments/:id/submit", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      published: true,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cls = await ClassModel.findById(assessment.classId).lean();
    if (!cls || !cls.studentIds.some((id) => id.toString() === req.user.sub)) {
      return res.status(403).json({ message: "You are not enrolled in this class" });
    }
    const mode = assessment.deliveryMode || "digital";
    if (mode === "paper") {
      return res.status(400).json({
        message: "This assessment uses paper answer sheets. Upload your scan from the sheet QR link.",
      });
    }
    const pendingPaper = await PaperCapture.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
      status: { $ne: "graded" },
    });
    if (pendingPaper) {
      return res.status(409).json({
        message:
          "You have a paper scan awaiting teacher review. Wait for grading or ask your teacher to dismiss it before taking the quiz online.",
      });
    }
    const dup = await Submission.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    });
    if (dup) {
      return res.status(409).json({ message: "Already submitted" });
    }
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers array required" });
    }
    const { score, maxScore, normalized } = await scoreAnswers(assessment, answers);
    const submission = await Submission.create({
      assessmentId: assessment._id,
      studentId: req.user.sub,
      answers: normalized,
      score,
      maxScore,
      source: "digital",
    });
    res.status(201).json({
      submission: {
        id: submission._id,
        score: submission.score,
        maxScore: submission.maxScore,
        percentage: maxScore ? Math.round((100 * score) / maxScore) : 0,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

studentRouter.get("/results/:assessmentId", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      published: true,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cls = await ClassModel.findById(assessment.classId).lean();
    if (!cls || !cls.studentIds.some((id) => id.toString() === req.user.sub)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    const sub = await Submission.findOne({
      assessmentId: assessment._id,
      studentId: req.user.sub,
    }).lean();
    if (!sub) return res.status(404).json({ message: "No submission yet" });
    const questions = await Question.find({ _id: { $in: assessment.questionIds } }).lean();
    const qmap = Object.fromEntries(questions.map((q) => [q._id.toString(), q]));
    const order = (assessment.questionIds || []).map((id) => id.toString());
    const feedback = order.map((qid) => {
      const q = qmap[qid];
      const ans = sub.answers?.find((a) => a.questionId.toString() === qid);
      const selected = ans?.selectedIndex;
      const correct = q && selected === q.correctIndex;
      return {
        questionId: qid,
        text: q?.text,
        skill: q?.skill,
        options: q?.options,
        selectedIndex: selected,
        correctIndex: q?.correctIndex,
        correct: Boolean(correct),
      };
    });
    res.json({
      title: assessment.title,
      score: sub.score,
      maxScore: sub.maxScore,
      percentage: sub.maxScore ? Math.round((100 * sub.score) / sub.maxScore) : 0,
      submittedAt: sub.submittedAt,
      source: sub.source || "digital",
      feedback,
    });
  } catch (e) {
    next(e);
  }
});

function serializeStudentClass(c) {
  return {
    id: c._id,
    name: c.name,
    joinCode: c.joinCode,
  };
}

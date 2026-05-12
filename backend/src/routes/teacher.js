import { Router } from "express";
import fs from "fs";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { ClassModel } from "../models/Class.js";
import { Question } from "../models/Question.js";
import { Assessment } from "../models/Assessment.js";
import { Submission } from "../models/Submission.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { AnswerSheetToken } from "../models/AnswerSheetToken.js";
import { PaperCapture } from "../models/PaperCapture.js";
import { scoreAnswers } from "../lib/scoreSubmission.js";
import { paperFileAbsolute } from "../middleware/uploadPaper.js";

/** Normalize delivery mode from JSON (handles casing, whitespace, delivery_mode alias). */
function parseDeliveryModeCreate(body) {
  const raw = body?.deliveryMode ?? body?.delivery_mode;
  if (raw == null || raw === "") return "digital";
  const s = String(raw).trim().toLowerCase();
  if (!["digital", "paper", "hybrid"].includes(s)) return "digital";
  return s;
}

/** PATCH: only updates when client sends deliveryMode or delivery_mode. Returns false if invalid. */
function parseDeliveryModePatch(body) {
  if (!("deliveryMode" in body) && !("delivery_mode" in body)) return { skip: true };
  const raw = body.deliveryMode ?? body.delivery_mode;
  if (raw == null || raw === "") return { error: "deliveryMode cannot be empty" };
  const s = String(raw).trim().toLowerCase();
  if (!["digital", "paper", "hybrid"].includes(s)) return { error: "deliveryMode must be digital, paper, or hybrid" };
  return { mode: s };
}

export const teacherRouter = Router();
teacherRouter.use(authMiddleware, requireRole("teacher"));

teacherRouter.get("/subjects", async (_req, res, next) => {
  try {
    const list = await Subject.find({ active: true }).sort({ name: 1 }).lean();
    res.json({
      subjects: list.map((s) => ({
        id: s._id,
        name: s.name,
        code: s.code,
      })),
    });
  } catch (e) {
    next(e);
  }
});

teacherRouter.post("/classes", async (req, res, next) => {
  try {
    const { name, subjectId } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Class name required" });
    if (subjectId) {
      const sub = await Subject.findOne({ _id: subjectId, active: true });
      if (!sub) return res.status(400).json({ message: "Invalid subject" });
    }
    const joinCode = ClassModel.generateJoinCode();
    const cls = await ClassModel.create({
      name: name.trim(),
      teacherId: req.user.sub,
      joinCode,
      studentIds: [],
      subjectId: subjectId || null,
    });
    res.status(201).json({ class: await serializeClassFull(cls) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.patch("/classes/:id", async (req, res, next) => {
  try {
    const { name, subjectId } = req.body;
    const cls = await ClassModel.findOne({ _id: req.params.id, teacherId: req.user.sub });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (name != null) cls.name = String(name).trim();
    if (subjectId !== undefined) {
      if (subjectId === null || subjectId === "") cls.subjectId = null;
      else {
        const sub = await Subject.findOne({ _id: subjectId, active: true });
        if (!sub) return res.status(400).json({ message: "Invalid subject" });
        cls.subjectId = subjectId;
      }
    }
    await cls.save();
    res.json({ class: await serializeClassFull(cls) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/classes", async (req, res, next) => {
  try {
    const list = await ClassModel.find({ teacherId: req.user.sub })
      .sort({ updatedAt: -1 })
      .lean();
    const withCounts = await Promise.all(
      list.map(async (c) => {
        const published = await Assessment.countDocuments({
          classId: c._id,
          teacherId: req.user.sub,
          published: true,
        });
        return {
          ...(await serializeClassFull(c)),
          studentCount: c.studentIds?.length || 0,
          publishedAssessmentCount: published,
        };
      })
    );
    res.json({ classes: withCounts });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/classes/:id", async (req, res, next) => {
  try {
    const cls = await ClassModel.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const students = await User.find({ _id: { $in: cls.studentIds || [] } })
      .select("name email")
      .lean();
    res.json({
      class: {
        ...(await serializeClassFull(cls)),
        students: students.map((s) => ({ id: s._id, name: s.name, email: s.email })),
      },
    });
  } catch (e) {
    next(e);
  }
});

teacherRouter.post("/questions", async (req, res, next) => {
  try {
    const { text, options, correctIndex, subject, skill, content, difficulty } = req.body;
    if (!text || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: "text and at least 2 options required" });
    }
    const ci = Number(correctIndex);
    if (Number.isNaN(ci) || ci < 0 || ci >= options.length) {
      return res.status(400).json({ message: "correctIndex must match an option" });
    }
    const q = await Question.create({
      teacherId: req.user.sub,
      text: String(text),
      options: options.map(String),
      correctIndex: ci,
      subject: subject || "",
      skill: skill || "",
      content: content || "",
      difficulty: difficulty || "medium",
    });
    res.status(201).json({ question: serializeQuestion(q) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/questions", async (req, res, next) => {
  try {
    const list = await Question.find({ teacherId: req.user.sub })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ questions: list.map(serializeQuestion) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.delete("/questions/:id", async (req, res, next) => {
  try {
    const q = await Question.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.sub,
    });
    if (!q) return res.status(404).json({ message: "Question not found" });
    await Assessment.updateMany({ teacherId: req.user.sub }, { $pull: { questionIds: q._id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

teacherRouter.post("/assessments", async (req, res, next) => {
  try {
    const { title, classId, questionIds, published, timeLimitMinutes } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "title required" });
    if (!classId) return res.status(400).json({ message: "classId required" });
    const cls = await ClassModel.findOne({ _id: classId, teacherId: req.user.sub });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const ids = Array.isArray(questionIds) ? questionIds : [];
    const unique = [...new Set(ids.map(String))];
    if (unique.length === 0) {
      return res.status(400).json({ message: "At least one question required" });
    }
    const owned = await Question.countDocuments({
      _id: { $in: unique },
      teacherId: req.user.sub,
    });
    if (owned !== unique.length) {
      return res.status(400).json({ message: "All questions must belong to you" });
    }
    const isPublished =
      published === undefined || published === null ? true : Boolean(published);
    const mode = parseDeliveryModeCreate(req.body);
    const assessment = await Assessment.create({
      title: title.trim(),
      teacherId: req.user.sub,
      classId,
      questionIds: unique,
      published: isPublished,
      deliveryMode: mode,
      timeLimitMinutes:
        timeLimitMinutes != null && timeLimitMinutes !== ""
          ? Number(timeLimitMinutes)
          : null,
    });
    const populated = await Assessment.findById(assessment._id).lean();
    res.status(201).json({ assessment: await serializeAssessmentFull(populated) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.patch("/assessments/:id", async (req, res, next) => {
  try {
    const { published, title, questionIds, timeLimitMinutes } = req.body;
    const a = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    });
    if (!a) return res.status(404).json({ message: "Assessment not found" });
    if (title != null) a.title = String(title).trim();
    if (published != null) a.published = Boolean(published);
    const dm = parseDeliveryModePatch(req.body);
    if (!dm.skip) {
      if (dm.error) return res.status(400).json({ message: dm.error });
      a.deliveryMode = dm.mode;
    }
    if (timeLimitMinutes !== undefined) {
      a.timeLimitMinutes =
        timeLimitMinutes != null && timeLimitMinutes !== ""
          ? Number(timeLimitMinutes)
          : null;
    }
    if (Array.isArray(questionIds)) {
      const unique = [...new Set(questionIds.map(String))];
      const owned = await Question.countDocuments({
        _id: { $in: unique },
        teacherId: req.user.sub,
      });
      if (owned !== unique.length) {
        return res.status(400).json({ message: "All questions must belong to you" });
      }
      a.questionIds = unique;
    }
    await a.save();
    const populated = await Assessment.findById(a._id).lean();
    res.json({ assessment: await serializeAssessmentFull(populated) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments", async (req, res, next) => {
  try {
    const list = await Assessment.find({ teacherId: req.user.sub })
      .sort({ updatedAt: -1 })
      .lean();
    const out = await Promise.all(list.map((a) => serializeAssessmentFull(a)));
    res.json({ assessments: out });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments/:id", async (req, res, next) => {
  try {
    const a = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!a) return res.status(404).json({ message: "Assessment not found" });
    res.json({ assessment: await serializeAssessmentFull(a) });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments/:id/submissions", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const subs = await Submission.find({ assessmentId: assessment._id })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 })
      .lean();
    res.json({
      assessmentId: assessment._id,
      title: assessment.title,
      submissions: subs.map((s) => ({
        id: s._id,
        student: s.studentId
          ? { id: s.studentId._id, name: s.studentId.name, email: s.studentId.email }
          : null,
        score: s.score,
        maxScore: s.maxScore,
        percentage: s.maxScore ? Math.round((100 * s.score) / s.maxScore) : 0,
        submittedAt: s.submittedAt,
        source: s.source || "digital",
      })),
    });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments/:id/analytics", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    })
      .populate("questionIds")
      .lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const questions = assessment.questionIds || [];
    const subs = await Submission.find({ assessmentId: assessment._id }).lean();
    const perQuestion = questions.map((q) => {
      const qid = q._id.toString();
      let correct = 0;
      let attempted = 0;
      for (const s of subs) {
        const ans = s.answers?.find((a) => a.questionId.toString() === qid);
        if (ans) {
          attempted++;
          if (ans.selectedIndex === q.correctIndex) correct++;
        }
      }
      return {
        questionId: q._id,
        text: q.text,
        skill: q.skill,
        correctRate: attempted ? Math.round((100 * correct) / attempted) : null,
        attempted,
      };
    });
    const scores = subs.map((s) =>
      s.maxScore ? (100 * s.score) / s.maxScore : 0
    );
    const avg =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    res.json({
      assessmentId: assessment._id,
      title: assessment.title,
      submissionCount: subs.length,
      classAveragePercent: avg,
      perQuestion,
    });
  } catch (e) {
    next(e);
  }
});

/** FR-07: Export results to Excel (4.3) */
teacherRouter.get("/assessments/:id/export/excel", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    })
      .populate("questionIds")
      .lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const subs = await Submission.find({ assessmentId: assessment._id })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 })
      .lean();

    const wb = XLSX.utils.book_new();

    const header = ["Student", "Email", "Score", "Max score", "Percentage", "Source", "Submitted"];
    const rows = [
      header,
      ...subs.map((s) => {
        const stud = s.studentId && typeof s.studentId === "object" ? s.studentId : null;
        const pct = s.maxScore ? Math.round((100 * s.score) / s.maxScore) : 0;
        return [
          stud?.name || "",
          stud?.email || "",
          s.score,
          s.maxScore,
          pct,
          s.source || "digital",
          s.submittedAt ? new Date(s.submittedAt).toISOString() : "",
        ];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Submissions");

    const questions = assessment.questionIds || [];
    const perQuestion = questions.map((q) => {
      const qid = q._id.toString();
      let correct = 0;
      let attempted = 0;
      for (const s of subs) {
        const ans = s.answers?.find((a) => a.questionId.toString() === qid);
        if (ans) {
          attempted++;
          if (ans.selectedIndex === q.correctIndex) correct++;
        }
      }
      return {
        Question: q.text,
        Skill: q.skill || "",
        Content: q.content || "",
        Difficulty: q.difficulty || "",
        CorrectRatePercent: attempted ? Math.round((100 * correct) / attempted) : "",
        Attempted: attempted,
      };
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(perQuestion),
      "Per question"
    );

    const skillMap = new Map();
    for (const row of perQuestion) {
      const sk = row.Skill || "(unspecified)";
      if (!skillMap.has(sk)) skillMap.set(sk, { sum: 0, n: 0 });
      const cell = skillMap.get(sk);
      if (row.CorrectRatePercent !== "") {
        cell.sum += Number(row.CorrectRatePercent);
        cell.n += 1;
      }
    }
    const skillRows = [["Skill", "Avg correct rate %", "Questions counted"]];
    for (const [skill, { sum, n }] of skillMap) {
      skillRows.push([skill, n ? Math.round(sum / n) : "", n]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(skillRows), "By skill");

    const summary =
      subs.length > 0
        ? Math.round(
            subs.reduce((acc, s) => acc + (s.maxScore ? (100 * s.score) / s.maxScore : 0), 0) /
              subs.length
          )
        : 0;
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Assessment", assessment.title],
        ["Delivery mode", assessment.deliveryMode || "digital"],
        ["Class average %", summary],
        ["Submission count", subs.length],
        ["Exported", new Date().toISOString()],
      ]),
      "Summary"
    );

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeTitle = String(assessment.title || "assessment")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 60);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}-results.xlsx"`);
    res.send(Buffer.from(buf));
  } catch (e) {
    next(e);
  }
});

teacherRouter.post("/assessments/:id/answer-sheets/generate", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cls = await ClassModel.findById(assessment.classId).lean();
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const students = cls.studentIds || [];
    if (students.length === 0) {
      return res.status(400).json({ message: "No students enrolled in this class yet" });
    }
    await AnswerSheetToken.deleteMany({ assessmentId: assessment._id });
    const docs = students.map((sid) => ({
      token: AnswerSheetToken.generateToken(),
      assessmentId: assessment._id,
      studentId: sid,
      classId: cls._id,
      teacherId: req.user.sub,
    }));
    await AnswerSheetToken.insertMany(docs);
    res.status(201).json({ generated: docs.length });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments/:id/answer-sheets", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    let tokens = await AnswerSheetToken.find({ assessmentId: assessment._id }).lean();
    if (tokens.length === 0) {
      return res.status(400).json({
        message: "No answer sheets yet. Use “Generate QR sheets” first.",
      });
    }
    const base = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const qids = (assessment.questionIds || []).map((id) => id.toString());
    const qs = await Question.find({ _id: { $in: qids } }).lean();
    const qmap = Object.fromEntries(qs.map((q) => [q._id.toString(), q]));
    const questions = qids.map((id) => qmap[id]).filter(Boolean);
    const uids = [...new Set(tokens.map((t) => t.studentId.toString()))];
    const users = await User.find({ _id: { $in: uids } })
      .select("name email")
      .lean();
    const umap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    const sheets = await Promise.all(
      tokens.map(async (t) => {
        const u = umap[t.studentId.toString()];
        const url = `${base}/student/paper-upload?token=${t.token}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1, errorCorrectionLevel: "M" });
        return {
          token: t.token,
          qrUrl: url,
          qrDataUrl,
          student: { id: t.studentId, name: u?.name || "", email: u?.email || "" },
        };
      })
    );
    res.json({
      assessment: {
        id: assessment._id,
        title: assessment.title,
        deliveryMode: assessment.deliveryMode || "digital",
      },
      questions: questions.map((q) => ({
        id: q._id,
        text: q.text,
        optionCount: q.options.length,
        options: q.options,
      })),
      sheets,
    });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/assessments/:id/paper-captures", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      teacherId: req.user.sub,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const list = await PaperCapture.find({ assessmentId: assessment._id })
      .populate("studentId", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      captures: list.map((c) => ({
        id: c._id,
        status: c.status,
        sheetToken: c.sheetToken,
        createdAt: c.createdAt,
        cvNotes: c.cvNotes,
        student: c.studentId
          ? { id: c.studentId._id, name: c.studentId.name, email: c.studentId.email }
          : null,
        imageUrl: `/api/teacher/paper-captures/${c._id}/file`,
      })),
    });
  } catch (e) {
    next(e);
  }
});

teacherRouter.get("/paper-captures/:captureId/file", async (req, res, next) => {
  try {
    const cap = await PaperCapture.findById(req.params.captureId).lean();
    if (!cap) return res.status(404).json({ message: "Not found" });
    const a = await Assessment.findOne({
      _id: cap.assessmentId,
      teacherId: req.user.sub,
    }).lean();
    if (!a) return res.status(403).json({ message: "Forbidden" });
    const abs = paperFileAbsolute(cap.imagePath);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: "File missing" });
    res.setHeader("Content-Type", cap.imageMime || "image/jpeg");
    res.sendFile(abs);
  } catch (e) {
    next(e);
  }
});

teacherRouter.post("/assessments/:aid/paper-captures/:cid/validate", async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.aid,
      teacherId: req.user.sub,
    }).lean();
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const cap = await PaperCapture.findOne({
      _id: req.params.cid,
      assessmentId: assessment._id,
    });
    if (!cap) return res.status(404).json({ message: "Capture not found" });
    if (cap.status === "graded") {
      return res.status(409).json({ message: "Already graded" });
    }
    const existing = await Submission.findOne({
      assessmentId: assessment._id,
      studentId: cap.studentId,
    });
    if (existing) {
      return res.status(409).json({ message: "Student already has a submission" });
    }
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers array required" });
    }
    const { score, maxScore, normalized } = await scoreAnswers(assessment, answers);
    const submission = await Submission.create({
      assessmentId: assessment._id,
      studentId: cap.studentId,
      answers: normalized,
      score,
      maxScore,
      source: "paper",
    });
    cap.validatedAnswers = normalized;
    cap.status = "graded";
    cap.submissionId = submission._id;
    await cap.save();
    res.json({
      submission: {
        id: submission._id,
        score,
        maxScore,
        percentage: maxScore ? Math.round((100 * score) / maxScore) : 0,
      },
    });
  } catch (e) {
    next(e);
  }
});

async function serializeClassFull(c) {
  const plain = typeof c.toObject === "function" ? c.toObject() : c;
  let subject = null;
  if (plain.subjectId) {
    const s = await Subject.findById(plain.subjectId).select("name code").lean();
    if (s) subject = { id: s._id, name: s.name, code: s.code };
  }
  return {
    id: plain._id,
    name: plain.name,
    joinCode: plain.joinCode,
    subjectId: plain.subjectId || null,
    subject,
    studentCount: plain.studentIds?.length || 0,
    createdAt: plain.createdAt,
  };
}

function serializeClass(c) {
  return {
    id: c._id,
    name: c.name,
    joinCode: c.joinCode,
    studentCount: c.studentIds?.length || 0,
    createdAt: c.createdAt,
  };
}

function serializeQuestion(q) {
  return {
    id: q._id,
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    subject: q.subject,
    skill: q.skill,
    content: q.content,
    difficulty: q.difficulty,
  };
}

async function serializeAssessmentFull(a) {
  if (!a) return null;
  const cls = await ClassModel.findById(a.classId).select("name joinCode").lean();
  const qids = (a.questionIds || []).map((id) => id.toString());
  const qs = await Question.find({ _id: { $in: qids } }).lean();
  const map = Object.fromEntries(qs.map((x) => [x._id.toString(), x]));
  const questions = qids.map((id) => map[id]).filter(Boolean).map(serializeQuestion);
  return {
    id: a._id,
    title: a.title,
    classId: a.classId,
    className: cls?.name || "",
    joinCode: cls?.joinCode,
    published: a.published,
    timeLimitMinutes: a.timeLimitMinutes,
    deliveryMode: a.deliveryMode || "digital",
    questions,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

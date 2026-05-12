import { Router } from "express";
import bcrypt from "bcryptjs";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { ClassModel } from "../models/Class.js";
import { Assessment } from "../models/Assessment.js";
import { Submission } from "../models/Submission.js";

export const adminRouter = Router();
adminRouter.use(authMiddleware, requireRole("admin"));

/** Institutional dashboard / analytics (4.4 Reporting — institution level) */
adminRouter.get("/insights", async (_req, res, next) => {
  try {
    const [teachers, students, admins, classes, subjects, assessments, submissions] =
      await Promise.all([
        User.countDocuments({ role: "teacher" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "admin" }),
        ClassModel.countDocuments(),
        Subject.countDocuments({ active: true }),
        Assessment.countDocuments(),
        Submission.countDocuments(),
      ]);

    const recentSubs = await Submission.find({})
      .sort({ submittedAt: -1 })
      .limit(400)
      .populate("studentId", "name email")
      .populate("assessmentId", "title")
      .lean();

    const atRisk = [];
    for (const s of recentSubs) {
      if (!s.maxScore || s.maxScore <= 0) continue;
      const pct = Math.round((100 * s.score) / s.maxScore);
      if (pct < 40 && atRisk.length < 25) {
        const stud = s.studentId && typeof s.studentId === "object" ? s.studentId : null;
        const asmt = s.assessmentId && typeof s.assessmentId === "object" ? s.assessmentId : null;
        atRisk.push({
          percentage: pct,
          score: s.score,
          maxScore: s.maxScore,
          submittedAt: s.submittedAt,
          studentName: stud?.name || "",
          studentEmail: stud?.email || "",
          assessmentTitle: asmt?.title || "",
        });
      }
    }

    res.json({
      counts: { teachers, students, admins, classes, subjects, assessments, submissions },
      atRisk,
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/users", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const filter = q
      ? {
          $or: [
            { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
            { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          ],
        }
      : {};
    const users = await User.find(filter).select("-passwordHash").sort({ updatedAt: -1 }).limit(200).lean();
    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/users/:id", async (req, res, next) => {
  try {
    const { name, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.equals(req.user.sub)) {
      return res.status(400).json({ message: "Use profile to change your own account" });
    }
    if (name != null && typeof name === "string") {
      const t = name.trim();
      if (!t) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = t;
    }
    if (role != null) {
      if (!["teacher", "student", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      user.role = role;
    }
    await user.save();
    res.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: "email, password, name, role required" });
    }
    if (!["teacher", "student", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      role,
    });
    res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/subjects", async (_req, res, next) => {
  try {
    const list = await Subject.find().sort({ code: 1 }).lean();
    res.json({
      subjects: list.map((s) => ({
        id: s._id,
        name: s.name,
        code: s.code,
        description: s.description,
        active: s.active,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/subjects", async (req, res, next) => {
  try {
    const { name, code, description, active } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ message: "name and code required" });
    }
    const s = await Subject.create({
      name: name.trim(),
      code: String(code).trim().toUpperCase(),
      description: description || "",
      active: active !== false,
    });
    res.status(201).json({
      subject: { id: s._id, name: s.name, code: s.code, description: s.description, active: s.active },
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Subject code already exists" });
    next(e);
  }
});

adminRouter.patch("/subjects/:id", async (req, res, next) => {
  try {
    const { name, code, description, active } = req.body;
    const s = await Subject.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Subject not found" });
    if (name != null) s.name = String(name).trim();
    if (code != null) s.code = String(code).trim().toUpperCase();
    if (description != null) s.description = String(description);
    if (active != null) s.active = Boolean(active);
    await s.save();
    res.json({
      subject: { id: s._id, name: s.name, code: s.code, description: s.description, active: s.active },
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Subject code already exists" });
    next(e);
  }
});

adminRouter.delete("/subjects/:id", async (req, res, next) => {
  try {
    const s = await Subject.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ message: "Subject not found" });
    await ClassModel.updateMany({ subjectId: s._id }, { $unset: { subjectId: 1 } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/classes", async (_req, res, next) => {
  try {
    const list = await ClassModel.find()
      .populate("teacherId", "name email")
      .populate("subjectId", "name code")
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();
    res.json({
      classes: list.map((c) => ({
        id: c._id,
        name: c.name,
        joinCode: c.joinCode,
        studentCount: c.studentIds?.length || 0,
        teacher: c.teacherId
          ? { id: c.teacherId._id, name: c.teacherId.name, email: c.teacherId.email }
          : null,
        subject: c.subjectId
          ? { id: c.subjectId._id, name: c.subjectId.name, code: c.subjectId.code }
          : null,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

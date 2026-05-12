import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: "email, password, name, and role are required" });
    }
    if (role === "admin") {
      const secret = process.env.ADMIN_INVITE_SECRET;
      const header = req.headers["x-admin-invite"];
      if (!secret || header !== secret) {
        return res.status(403).json({ message: "Admin registration requires a valid invite" });
      }
    } else if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({ message: "role must be teacher, student, or admin (with invite)" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      role,
    });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password required" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.patch("/me", authMiddleware, async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name != null && typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = trimmed;
    }

    if (newPassword != null && newPassword !== "") {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

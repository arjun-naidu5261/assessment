import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { authRouter } from "./routes/auth.js";
import { teacherRouter } from "./routes/teacher.js";
import { studentRouter } from "./routes/student.js";
import { adminRouter } from "./routes/admin.js";
import { publicRouter } from "./routes/publicApi.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/student", studentRouter);
app.use("/api/admin", adminRouter);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message || "Upload error" });
  }
  if (err?.message === "Only image uploads are allowed") {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => {
    app.listen(PORT, () => console.log(`API http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

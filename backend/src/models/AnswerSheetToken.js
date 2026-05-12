import mongoose from "mongoose";
import crypto from "crypto";

const answerSheetTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

answerSheetTokenSchema.statics.generateToken = function generateToken() {
  return crypto.randomBytes(24).toString("hex");
};

export const AnswerSheetToken = mongoose.model("AnswerSheetToken", answerSheetTokenSchema);

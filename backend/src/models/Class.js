import mongoose from "mongoose";
import crypto from "crypto";

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinCode: { type: String, required: true, unique: true, index: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  },
  { timestamps: true }
);

classSchema.statics.generateJoinCode = function generateJoinCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

export const ClassModel = mongoose.model("Class", classSchema);

import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true, min: 0 },
    subject: { type: String, default: "", trim: true },
    skill: { type: String, default: "", trim: true },
    content: { type: String, default: "", trim: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  },
  { timestamps: true }
);

export const Question = mongoose.model("Question", questionSchema);

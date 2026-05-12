import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedIndex: { type: Number, required: true },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [answerSchema],
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ["digital", "paper"], default: "digital" },
  },
  { timestamps: true }
);

submissionSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model("Submission", submissionSchema);

import mongoose from "mongoose";

const paperCaptureSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sheetToken: { type: String, required: true },
    imagePath: { type: String, required: true },
    imageMime: { type: String, default: "image/jpeg" },
    /** Placeholder for computer-vision output; teacher validates/corrects */
    cvSuggestion: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        selectedIndex: { type: Number },
      },
    ],
    /** Final answers after teacher validation (same shape as digital submission) */
    validatedAnswers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
        selectedIndex: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["uploaded", "processing", "needs_review", "graded"],
      default: "uploaded",
    },
    cvNotes: { type: String, default: "" },
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", default: null },
  },
  { timestamps: true }
);

paperCaptureSchema.index({ assessmentId: 1, studentId: 1 });
paperCaptureSchema.index({ sheetToken: 1 });

export const PaperCapture = mongoose.model("PaperCapture", paperCaptureSchema);

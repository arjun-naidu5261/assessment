import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    published: { type: Boolean, default: false },
    timeLimitMinutes: { type: Number, default: null },
    /** digital = online only; paper = scan workflow; hybrid = both allowed */
    deliveryMode: {
      type: String,
      enum: ["digital", "paper", "hybrid"],
      default: "digital",
    },
  },
  { timestamps: true }
);

export const Assessment = mongoose.model("Assessment", assessmentSchema);

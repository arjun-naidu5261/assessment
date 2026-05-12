import { Question } from "../models/Question.js";

export async function scoreAnswers(assessment, answersPayload) {
  const qids = (assessment.questionIds || []).map((id) => id.toString());
  const questions = await Question.find({ _id: { $in: assessment.questionIds } }).lean();
  const correctMap = Object.fromEntries(
    questions.map((q) => [q._id.toString(), q.correctIndex])
  );
  let score = 0;
  const normalized = [];
  for (const qid of qids) {
    const a = answersPayload.find((x) => x && String(x.questionId) === qid);
    const selected = a != null ? Number(a.selectedIndex) : NaN;
    if (!Number.isNaN(selected) && correctMap[qid] === selected) score++;
    normalized.push({
      questionId: qid,
      selectedIndex: Number.isNaN(selected) ? -1 : selected,
    });
  }
  const maxScore = qids.length;
  return { score, maxScore, normalized };
}

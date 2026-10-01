import { HttpError } from "@/lib/errors";
import {
  isAnswer,
  MAX_HUNCHES,
  MAX_HISTORY,
  MAX_QUESTION_CHARS,
  type GameAction,
  type HistoryEntry,
  type MindReaderResponse,
} from "@/lib/mindreader-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function clipWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return words.slice(0, maxWords).join(" ");
}

export function parseMindReaderRequest(body: unknown): HistoryEntry[] {
  const record = asRecord(body);
  if (!record) {
    throw new HttpError(400, "Αναμένεται αντικείμενο JSON με πίνακα history.");
  }

  const { history } = record;
  if (!Array.isArray(history)) {
    throw new HttpError(400, "Το history πρέπει να είναι πίνακας.");
  }

  if (history.length > MAX_HISTORY) {
    throw new HttpError(400, `Το history δεν μπορεί να έχει πάνω από ${MAX_HISTORY} απαντήσεις.`);
  }

  const parsed: HistoryEntry[] = [];
  for (let i = 0; i < history.length; i += 1) {
    const entry = asRecord(history[i]);
    if (!entry) {
      throw new HttpError(400, `Το history[${i}] πρέπει να είναι αντικείμενο.`);
    }
    const question = entry.question;
    const answer = entry.answer;
    if (typeof question !== "string" || question.trim().length === 0) {
      throw new HttpError(400, `Το history[${i}].question πρέπει να είναι μη κενό κείμενο.`);
    }
    if (question.length > MAX_QUESTION_CHARS) {
      throw new HttpError(400, `Το history[${i}].question υπερβαίνει τους ${MAX_QUESTION_CHARS} χαρακτήρες.`);
    }
    if (!isAnswer(answer)) {
      throw new HttpError(400, `Το history[${i}].answer πρέπει να είναι yes, no, sometimes ή unknown.`);
    }
    parsed.push({ question: question.trim(), answer });
  }

  return parsed;
}

function readStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function readHunches(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const hunches: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    hunches.push(trimmed.slice(0, 80));
    if (hunches.length >= MAX_HUNCHES) {
      break;
    }
  }
  return hunches;
}

export function normalizeModelOutput(
  raw: unknown,
  historyLength: number,
): MindReaderResponse {
  const record = asRecord(raw);
  if (!record) {
    throw new HttpError(502, "Το μοντέλο επέστρεψε μη αναγνώσιμο payload.");
  }

  const hunches = readHunches(record.hunches);
  const reactionRaw = readStringOrNull(record.reaction);
  const reaction = reactionRaw ? clipWords(reactionRaw, 8) : null;
  const confidenceRaw = Number(record.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.round(clamp(confidenceRaw, 0, 100))
    : 0;

  const mustGuess = historyLength >= MAX_HISTORY;
  const nextQuestionNumber = mustGuess ? MAX_HISTORY : historyLength + 1;
  const mayGuessEarly = historyLength >= 4;
  const extremelyObvious = historyLength < 4 && confidence >= 98;

  let action: GameAction = record.action === "guess" ? "guess" : "question";
  let question = readStringOrNull(record.question);
  let guess = readStringOrNull(record.guess);

  if (mustGuess) {
    action = "guess";
    question = null;
    guess = guess ?? hunches[0] ?? "κάτι που μόνο εσύ θα διάλεγες";
  } else if (action === "guess") {
    const allowed = (mayGuessEarly && confidence >= 92 && guess) || (extremelyObvious && guess);
    if (!allowed) {
      action = "question";
      guess = null;
    }
  }

  if (action === "question") {
    guess = null;
    if (!question) {
      throw new HttpError(502, "Το μοντέλο δεν επέστρεψε ερώτηση.");
    }
    if (!question.endsWith("?")) {
      question = `${question}?`;
    }
    if (question.length > MAX_QUESTION_CHARS) {
      question = `${question.slice(0, MAX_QUESTION_CHARS - 1).trim()}?`;
    }
    return {
      action: "question",
      question,
      questionNumber: nextQuestionNumber,
      confidence,
      hunches,
      reaction,
      guess: null,
    };
  }

  return {
    action: "guess",
    question: null,
    questionNumber: nextQuestionNumber,
    confidence: Math.max(confidence, mustGuess ? confidence : 92),
    hunches,
    reaction,
    guess,
  };
}

export function parseModelText(outputText: string): unknown {
  const trimmed = outputText.trim();
  if (!trimmed) {
    throw new HttpError(502, "Το μοντέλο επέστρεψε κενή έξοδο.");
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new HttpError(502, "Το μοντέλο επέστρεψε κατεστραμμένο JSON.");
  }
}

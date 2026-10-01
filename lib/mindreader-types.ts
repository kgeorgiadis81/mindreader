export const ANSWERS = ["yes", "no", "sometimes", "unknown"] as const;
export type Answer = (typeof ANSWERS)[number];

export type HistoryEntry = {
  question: string;
  answer: Answer;
};

export type MindReaderRequest = {
  history: HistoryEntry[];
};

export type GameAction = "question" | "guess";

export type MindReaderResponse = {
  action: GameAction;
  question: string | null;
  questionNumber: number;
  confidence: number;
  hunches: string[];
  reaction: string | null;
  guess: string | null;
};

export const MAX_HISTORY = 10;
export const MAX_QUESTION_CHARS = 300;
export const MAX_HUNCHES = 3;
export const MAX_SECRET_CHARS = 100;
export const DEFAULT_MODEL = "gpt-5.6-luna";
export const PSYCHIC_GLITCH = "Τα τηλεπαθητικά μου δυνάμεις χάλασαν.";

export function isAnswer(value: unknown): value is Answer {
  return typeof value === "string" && (ANSWERS as readonly string[]).includes(value);
}

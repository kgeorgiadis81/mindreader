import type { Answer, HistoryEntry, MindReaderResponse } from "@/lib/mindreader-types";
import { MAX_HISTORY } from "@/lib/mindreader-types";

const QUESTIONS = [
  "Is it a physical thing you could touch?",
  "Is it alive — or was it once alive?",
  "Is it a specific person, character, or named being?",
  "Is it bigger than a loaf of bread?",
  "Would most people recognize its name?",
  "Is it something you encounter in ordinary daily life?",
  "Is it primarily man-made?",
  "Is it tied to entertainment, media, or art?",
  "Would you usually find it indoors?",
  "Is it something you could hold in one hand?",
] as const;

const REACTIONS = [
  "Opening the channel.",
  "Split the field.",
  "Interesting.",
  "The outline sharpens.",
  "Not a crowd thought.",
  "Closer.",
  "The noise drops.",
  "One thread left.",
  "Almost visible.",
  "All in.",
] as const;

function answerAt(history: HistoryEntry[], index: number): Answer | undefined {
  return history[index]?.answer;
}

function isYes(history: HistoryEntry[], index: number): boolean {
  return answerAt(history, index) === "yes";
}

function mockHunches(history: HistoryEntry[]): string[] {
  if (history.length === 0) {
    return [];
  }
  const physical = isYes(history, 0);
  const alive = isYes(history, 1);
  const person = isYes(history, 2);
  const media = isYes(history, 7);

  if (!physical && media) {
    return ["Inception", "The Shawshank Redemption", "a song stuck in your head"];
  }
  if (!physical && person) {
    return ["a fictional character", "a historical figure", "someone you miss"];
  }
  if (!physical) {
    return ["freedom", "home", "anxiety"];
  }
  if (alive && person) {
    return ["your mom", "Taylor Swift", "a coworker"];
  }
  if (alive) {
    return ["a golden retriever", "a house cat", "an elephant"];
  }
  return ["a smartphone", "a coffee mug", "a rubber duck"];
}

function mockFinalGuess(history: HistoryEntry[]): string {
  const physical = isYes(history, 0);
  const alive = isYes(history, 1);
  const person = isYes(history, 2);
  const big = isYes(history, 3);
  const famous = isYes(history, 4);
  const daily = isYes(history, 5);
  const manmade = isYes(history, 6);
  const media = isYes(history, 7);
  const indoor = isYes(history, 8);
  const handheld = isYes(history, 9);

  if (!physical && media && famous) return "The Shawshank Redemption";
  if (!physical && media) return "a song you cannot name cleanly";
  if (!physical && person) return "a historical figure you admire";
  if (!physical) return "the idea of home";
  if (alive && person && famous) return "Taylor Swift";
  if (alive && person) return "your mom";
  if (alive && !person && big) return "an elephant";
  if (alive) return "a golden retriever";
  if (manmade && handheld && daily) return "your smartphone";
  if (manmade && indoor && !big) return "a coffee mug";
  if (manmade && big) return "a refrigerator";
  if (!manmade && indoor) return "a houseplant";
  return "a rubber duck";
}

/** Local demo mind used only when OPENAI_API_KEY is missing. */
export function mockMindReader(history: HistoryEntry[]): MindReaderResponse {
  const answered = history.length;
  const hunches = mockHunches(history);

  if (answered >= MAX_HISTORY) {
    return {
      action: "guess",
      question: null,
      questionNumber: MAX_HISTORY,
      confidence: 64,
      hunches,
      reaction: REACTIONS[9],
      guess: mockFinalGuess(history),
    };
  }

  return {
    action: "question",
    question: QUESTIONS[answered] ?? QUESTIONS[QUESTIONS.length - 1],
    questionNumber: answered + 1,
    confidence: Math.min(10 + answered * 8, 84),
    hunches,
    reaction: REACTIONS[answered] ?? null,
    guess: null,
  };
}

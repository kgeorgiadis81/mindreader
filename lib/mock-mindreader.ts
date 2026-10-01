import type { Answer, HistoryEntry, MindReaderResponse } from "@/lib/mindreader-types";
import { MAX_HISTORY } from "@/lib/mindreader-types";

const QUESTIONS = [
  "Είναι κάτι φυσικό που θα μπορούσες να αγγίξεις;",
  "Είναι ζωντανό — ή ήταν κάποτε ζωντανό;",
  "Είναι συγκεκριμένο πρόσωπο, χαρακτήρας ή ονομαστικός φορέας;",
  "Είναι μεγαλύτερο από ένα καρβέλι ψωμί;",
  "Θα αναγνώριζαν οι περισσότεροι το όνομά του;",
  "Είναι κάτι που συναντάς στην καθημερινότητα;",
  "Είναι κυρίως ανθρώπινης κατασκευής;",
  "Συνδέεται με ψυχαγωγία, μέσα ή τέχνη;",
  "Θα το έβρισκες συνήθως σε εσωτερικό χώρο;",
  "Μπορείς να το κρατήσεις με το ένα χέρι;",
] as const;

const REACTIONS = [
  "Ανοίγει το κανάλι.",
  "Κόβω το πεδίο.",
  "Ενδιαφέρον.",
  "Η σιλουέτα ξεκαθαρίζει.",
  "Όχι μαζική σκέψη.",
  "Πιο κοντά.",
  "Ο θόρυβος πέφτει.",
  "Μία κλωστή ακόμα.",
  "Σχεδόν ορατό.",
  "Όλα μέσα.",
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
    return ["Inception", "The Shawshank Redemption", "ένα τραγούδι κολλημένο στο μυαλό σου"];
  }
  if (!physical && person) {
    return ["φανταστικός χαρακτήρας", "ιστορικό πρόσωπο", "κάποιον που λείπεις"];
  }
  if (!physical) {
    return ["ελευθερία", "σπίτι", "άγχος"];
  }
  if (alive && person) {
    return ["η μαμά σου", "Taylor Swift", "συνάδελφος"];
  }
  if (alive) {
    return ["χρυσός ρετρίβερ", "σπιτό γάτο", "ελέφαντας"];
  }
  return ["ένα smartphone", "ένας φλίτζανας καφέ", "πλαστική πάπια"];
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
  if (!physical && media) return "ένα τραγούδι που δεν μπορείς να ονομάσεις καθαρά";
  if (!physical && person) return "ένα ιστορικό πρόσωπο που θαυμάζεις";
  if (!physical) return "η ιδέα του σπιτιού";
  if (alive && person && famous) return "Taylor Swift";
  if (alive && person) return "η μαμά σου";
  if (alive && !person && big) return "ένας ελέφαντας";
  if (alive) return "ένας χρυσός ρετρίβερ";
  if (manmade && handheld && daily) return "το smartphone σου";
  if (manmade && indoor && !big) return "ένας φλίτζανας καφέ";
  if (manmade && big) return "ένα ψυγείο";
  if (!manmade && indoor) return "ένα φυτό εσωτερικού χώρου";
  return "μια πλαστική πάπια";
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

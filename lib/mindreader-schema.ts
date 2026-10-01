/**
 * Strict JSON Schema for OpenAI Structured Outputs.
 * All properties required; nullable fields use type: [T, "null"].
 */
export const MINDREADER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["question", "guess"],
      description: "Ρώτα άλλη ερώτηση ή κάνε την μία τελική πρόβλεψη.",
    },
    question: {
      type: ["string", "null"],
      description: "Η επόμενη ερώτηση ναι/όχι στα Ελληνικά. Null όταν action είναι guess.",
    },
    questionNumber: {
      type: "integer",
      description: "1-based next question number, or 10 when guessing after 10 answers.",
    },
    confidence: {
      type: "number",
      description: "Calibrated 0-100 confidence in the current leading hypothesis.",
    },
    hunches: {
      type: "array",
      items: { type: "string" },
      description: "Έως 3 συγκεκριμένες υποψήφιες προβλέψεις στα Ελληνικά.",
    },
    reaction: {
      type: ["string", "null"],
      description: "Προαιρετική ατάκα στο χαρακτήρα, ~6 λέξεις ή λιγότερο, στα Ελληνικά.",
    },
    guess: {
      type: ["string", "null"],
      description: "Μία συγκεκριμένη τελική πρόβλεψη στα Ελληνικά. Null όταν action είναι question.",
    },
  },
  required: [
    "action",
    "question",
    "questionNumber",
    "confidence",
    "hunches",
    "reaction",
    "guess",
  ],
} as const;

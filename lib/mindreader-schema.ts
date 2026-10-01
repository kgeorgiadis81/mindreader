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
      description: "Ask another question, or make the one final guess.",
    },
    question: {
      type: ["string", "null"],
      description: "The next yes/no question. Null when action is guess.",
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
      description: "Up to 3 specific candidate guesses the player might be thinking of.",
    },
    reaction: {
      type: ["string", "null"],
      description: "Optional in-character aside, about 6 words or fewer.",
    },
    guess: {
      type: ["string", "null"],
      description: "One specific final guess. Null when action is question.",
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

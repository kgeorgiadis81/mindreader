import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mindreader/route";
import { MAX_HISTORY, type Answer, type HistoryEntry } from "@/lib/mindreader-types";

const { create } = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    responses = { create };
  },
}));

function historyOf(count: number, answer: Answer = "yes"): HistoryEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    question: `Is this question ${index + 1}?`,
    answer,
  }));
}

function modelPayload(overrides: Record<string, unknown>) {
  return {
    action: "question",
    question: "Is it a physical object you can touch?",
    questionNumber: 99,
    confidence: 12,
    hunches: ["a rubber duck"],
    reaction: "Opening the channel.",
    guess: null,
    ...overrides,
  };
}

async function postHistory(history: unknown) {
  return POST(
    new Request("http://127.0.0.1/api/mindreader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history }),
    }),
  );
}

describe("POST /api/mindreader", () => {
  beforeEach(() => {
    create.mockReset();
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-test-mock";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("1. empty history returns Question 1", async () => {
    create.mockResolvedValue({
      output_text: JSON.stringify(modelPayload({})),
    });

    const response = await postHistory([]);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.action).toBe("question");
    expect(body.questionNumber).toBe(1);
    expect(body.question).toMatch(/\?$/);
    expect(body.guess).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("2. 3 answers returns Question 4", async () => {
    create.mockResolvedValue({
      output_text: JSON.stringify(
        modelPayload({
          question: "Would most people recognize its name?",
          confidence: 40,
        }),
      ),
    });

    const response = await postHistory(historyOf(3));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.action).toBe("question");
    expect(body.questionNumber).toBe(4);
    expect(body.guess).toBeNull();
  });

  it("3. 10 answers forces a guess and never Question 11", async () => {
    create.mockResolvedValue({
      output_text: JSON.stringify(
        modelPayload({
          action: "question",
          question: "Is this illegally question 11?",
          questionNumber: 11,
          confidence: 55,
          hunches: ["a coffee mug"],
          guess: null,
        }),
      ),
    });

    const response = await postHistory(historyOf(MAX_HISTORY));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.action).toBe("guess");
    expect(body.question).toBeNull();
    expect(body.questionNumber).not.toBe(11);
    expect(body.questionNumber).toBe(10);
    expect(typeof body.guess).toBe("string");
    expect(body.guess.length).toBeGreaterThan(0);
  });

  it("4. invalid answer is rejected", async () => {
    const response = await postHistory([
      { question: "Is it alive?", answer: "maybe" },
    ]);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/answer|yes/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("5. 11 history entries return 400", async () => {
    const response = await postHistory(historyOf(11));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/10/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("6. malformed model output becomes a clean server error", async () => {
    create.mockResolvedValue({
      output_text: "<<<this is not json>>>",
    });

    const response = await postHistory([]);
    expect(response.status).toBeGreaterThanOrEqual(500);
    const body = await response.json();
    expect(body).toEqual({ error: expect.any(String) });
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.action).toBeUndefined();
    expect(body.stack).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mindreader/route";

const key = process.env.OPENAI_API_KEY ?? "";
const live = Boolean(key) && key !== "sk-test-mock" && !key.toLowerCase().includes("test-mock");

describe("live OpenAI smoke", () => {
  it.skipIf(!live)("empty history returns a valid Question 1 schema", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/mindreader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [] }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.action).toBe("question");
    expect(body.questionNumber).toBe(1);
    expect(typeof body.question).toBe("string");
    expect(body.guess).toBeNull();
    expect(typeof body.confidence).toBe("number");
    expect(Array.isArray(body.hunches)).toBe(true);
  });
});

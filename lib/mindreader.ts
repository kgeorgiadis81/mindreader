import OpenAI from "openai";
import { mockMindReader } from "@/lib/mock-mindreader";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/mindreader-prompt";
import { MINDREADER_JSON_SCHEMA } from "@/lib/mindreader-schema";
import {
  DEFAULT_MODEL,
  MAX_HISTORY,
  PSYCHIC_GLITCH,
  type HistoryEntry,
  type MindReaderResponse,
} from "@/lib/mindreader-types";
import { HttpError } from "@/lib/errors";
import { normalizeModelOutput, parseMindReaderRequest, parseModelText } from "@/lib/validate";

export function getModelName(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function extractOutputText(response: { output_text?: string }): string {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  return "";
}

export async function generateFromOpenAI(history: HistoryEntry[]): Promise<unknown> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: getModelName(),
    instructions: SYSTEM_PROMPT,
    input: buildUserPrompt(history),
    store: false,
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: "mind_reader_response",
        strict: true,
        schema: MINDREADER_JSON_SCHEMA,
      },
    },
  });

  return parseModelText(extractOutputText(response));
}

export type GenerateFn = (history: HistoryEntry[]) => Promise<unknown>;

export async function defaultGenerate(history: HistoryEntry[]): Promise<unknown> {
  if (!hasOpenAIKey()) {
    return mockMindReader(history);
  }
  try {
    return await generateFromOpenAI(history);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(502, PSYCHIC_GLITCH);
  }
}

export async function runMindReaderTurn(
  rawBody: unknown,
  generate: GenerateFn = defaultGenerate,
): Promise<{ status: number; body: MindReaderResponse | { error: string } }> {
  try {
    const history = parseMindReaderRequest(rawBody);
    const raw = await generate(history);
    const body = normalizeModelOutput(raw, history.length);
    if (history.length >= MAX_HISTORY && body.action !== "guess") {
      throw new HttpError(502, PSYCHIC_GLITCH);
    }
    return { status: 200, body };
  } catch (error) {
    if (error instanceof HttpError) {
      return { status: error.status, body: { error: error.message } };
    }
    return { status: 500, body: { error: PSYCHIC_GLITCH } };
  }
}

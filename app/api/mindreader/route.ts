import { runMindReaderTurn } from "@/lib/mindreader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { status, body } = await runMindReaderTurn(raw);
  return Response.json(body, { status });
}

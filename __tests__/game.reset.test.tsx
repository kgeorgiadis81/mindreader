import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "@/components/Game";
import { PSYCHIC_GLITCH } from "@/lib/mindreader-types";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("Game", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        jsonResponse({
          action: "question",
          question: "Είναι κάτι φυσικό που μπορείς να αγγίξεις;",
          questionNumber: 1,
          confidence: 11,
          hunches: [],
          reaction: "Ανοίγει το κανάλι.",
          guess: null,
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("7. PLAY AGAIN clears all state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        await jsonResponse({
          action: "question",
          question: "Είναι κάτι φυσικό που μπορείς να αγγίξεις;",
          questionNumber: 1,
          confidence: 11,
          hunches: ["μια πλαστική πάπια"],
          reaction: "Ανοίγει το κανάλι.",
          guess: null,
        }),
      )
      .mockResolvedValueOnce(
        await jsonResponse({
          action: "guess",
          question: null,
          questionNumber: 1,
          confidence: 96,
          hunches: ["μια πλαστική πάπια"],
          reaction: "Σε πιάσαμε.",
          guess: "μια πλαστική πάπια",
        }),
      );

    render(<Game />);

    await user.click(screen.getByRole("button", { name: "ΞΕΚΙΝΑ" }));
    await user.click(screen.getByRole("button", { name: /ΔΙΑΒΑΣΕ ΤΟ ΜΥΑΛΟ ΜΟΥ/i }));
    expect(await screen.findByText(/φυσικό που μπορείς να αγγίξεις/i)).toBeInTheDocument();
    expect(screen.getByText("μια πλαστική πάπια")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ΝΑΙ" }));
    expect(await screen.findByText("μια πλαστική πάπια")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ΝΑΙ!/i }));

    expect(screen.getByText(/Διάβασα το μυαλό σου/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ΠΑΙΞΕ ΞΑΝΑ" }));

    expect(screen.getByRole("button", { name: "ΞΕΚΙΝΑ" })).toBeInTheDocument();
    expect(screen.getByText(/Σκέψου οτιδήποτε/i)).toBeInTheDocument();
    expect(screen.queryByText(/φυσικό που μπορείς να αγγίξεις/i)).not.toBeInTheDocument();
    expect(screen.queryByText("μια πλαστική πάπια")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ΠΑΙΞΕ ΞΑΝΑ" })).not.toBeInTheDocument();
  });

  it("6. malformed API errors do not crash React", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse({ error: PSYCHIC_GLITCH }, 502),
    );

    render(<Game />);
    await user.click(screen.getByRole("button", { name: "ΞΕΚΙΝΑ" }));
    await user.click(screen.getByRole("button", { name: /ΔΙΑΒΑΣΕ ΤΟ ΜΥΑΛΟ ΜΟΥ/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(PSYCHIC_GLITCH);
    expect(screen.getByRole("button", { name: "ΔΟΚΙΜΑΣΕ ΞΑΝΑ" })).toBeInTheDocument();
    expect(screen.getByText(/Σκέψου κάτι/i)).toBeInTheDocument();
  });
});

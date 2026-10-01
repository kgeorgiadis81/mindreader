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
          question: "Is it a physical object you can touch?",
          questionNumber: 1,
          confidence: 11,
          hunches: [],
          reaction: "Opening the channel.",
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
          question: "Is it a physical object you can touch?",
          questionNumber: 1,
          confidence: 11,
          hunches: ["a rubber duck"],
          reaction: "Opening the channel.",
          guess: null,
        }),
      )
      .mockResolvedValueOnce(
        await jsonResponse({
          action: "guess",
          question: null,
          questionNumber: 1,
          confidence: 96,
          hunches: ["a rubber duck"],
          reaction: "Caught it.",
          guess: "a rubber duck",
        }),
      );

    render(<Game />);

    await user.click(screen.getByRole("button", { name: "START" }));
    await user.click(screen.getByRole("button", { name: /YES — READ MY MIND/i }));
    expect(await screen.findByText(/Is it a physical object you can touch/i)).toBeInTheDocument();
    expect(screen.getByText("a rubber duck")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "YES" }));
    expect(await screen.findByText("a rubber duck")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /YES!/i }));

    expect(screen.getByText(/I read your mind/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "PLAY AGAIN" }));

    expect(screen.getByRole("button", { name: "START" })).toBeInTheDocument();
    expect(screen.getByText(/Think of anything/i)).toBeInTheDocument();
    expect(screen.queryByText(/Is it a physical object you can touch/i)).not.toBeInTheDocument();
    expect(screen.queryByText("a rubber duck")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "PLAY AGAIN" })).not.toBeInTheDocument();
  });

  it("6. malformed API errors do not crash React", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse({ error: PSYCHIC_GLITCH }, 502),
    );

    render(<Game />);
    await user.click(screen.getByRole("button", { name: "START" }));
    await user.click(screen.getByRole("button", { name: /YES — READ MY MIND/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(PSYCHIC_GLITCH);
    expect(screen.getByRole("button", { name: "TRY AGAIN" })).toBeInTheDocument();
    expect(screen.getByText(/Think of something/i)).toBeInTheDocument();
  });
});

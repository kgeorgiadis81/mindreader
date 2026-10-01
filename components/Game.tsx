"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { Progress } from "@/components/Progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_HISTORY,
  MAX_SECRET_CHARS,
  PSYCHIC_GLITCH,
  type Answer,
  type HistoryEntry,
  type MindReaderResponse,
} from "@/lib/mindreader-types";

type Phase = "welcome" | "think" | "question" | "guess" | "won" | "lost";

const THINKING_LINES = [
  "Reading the signal...",
  "Narrowing possibilities...",
  "Tracing the outline...",
  "Listening between thoughts...",
  "Mapping the residue...",
];

const WIN_LINES = [
  "Don't look so surprised.",
  "Your mind is louder than you think.",
  "I wasn't guessing.",
  "Ten questions was generous.",
  "The static resolved.",
  "Caught you.",
];

const ANSWER_BUTTONS: { label: string; value: Answer; shortcut: string }[] = [
  { label: "YES", value: "yes", shortcut: "Y" },
  { label: "NO", value: "no", shortcut: "N" },
  { label: "SOMETIMES / SORT OF", value: "sometimes", shortcut: "S" },
  { label: "I DON'T KNOW", value: "unknown", shortcut: "U" },
];

type GameState = {
  phase: Phase;
  history: HistoryEntry[];
  question: string | null;
  questionNumber: number;
  confidence: number;
  hunches: string[];
  reaction: string | null;
  guess: string | null;
  error: string | null;
  submitting: boolean;
  guessStep: 0 | 1 | 2;
  secret: string;
  secretError: string | null;
  revealed: boolean;
  winLine: string;
  retryHistory: HistoryEntry[] | null;
};

const INITIAL_STATE: GameState = {
  phase: "welcome",
  history: [],
  question: null,
  questionNumber: 0,
  confidence: 0,
  hunches: [],
  reaction: null,
  guess: null,
  error: null,
  submitting: false,
  guessStep: 0,
  secret: "",
  secretError: null,
  revealed: false,
  winLine: WIN_LINES[0],
  retryHistory: null,
};

function pickWinLine(): string {
  return WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)] ?? WIN_LINES[0];
}

function suspenseDelay(): number {
  if (process.env.NODE_ENV === "test") {
    return 0;
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return 900;
}

async function requestTurn(history: HistoryEntry[]): Promise<MindReaderResponse> {
  const response = await fetch("/api/mindreader", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(PSYCHIC_GLITCH);
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : PSYCHIC_GLITCH;
    throw new Error(message);
  }

  const data = payload as Partial<MindReaderResponse>;
  if (data.action !== "question" && data.action !== "guess") {
    throw new Error(PSYCHIC_GLITCH);
  }
  if (history.length >= MAX_HISTORY && data.action !== "guess") {
    throw new Error(PSYCHIC_GLITCH);
  }
  return data as MindReaderResponse;
}

function MindSignal({
  confidence,
  hunches,
  reaction,
}: {
  confidence: number;
  hunches: string[];
  reaction: string | null;
}) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      aria-label="Mind signal"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
        Mind signal
      </p>
      <ConfidenceMeter value={confidence} />
      {hunches.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {hunches.map((hunch) => (
            <li
              key={hunch}
              className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs text-cyan-100/90"
            >
              {hunch}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Signal forming…</p>
      )}
      {reaction ? (
        <p className="mt-3 text-sm italic text-zinc-400" aria-live="polite">
          {reaction}
        </p>
      ) : null}
    </section>
  );
}

export function Game() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [thinkingLine, setThinkingLine] = useState(THINKING_LINES[0]);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!state.submitting) {
      return;
    }
    const id = window.setInterval(() => {
      setThinkingLine((current) => {
        const index = THINKING_LINES.indexOf(current);
        return THINKING_LINES[(index + 1) % THINKING_LINES.length] ?? THINKING_LINES[0];
      });
    }, 1200);
    return () => window.clearInterval(id);
  }, [state.submitting]);

  const applyTurn = useCallback((history: HistoryEntry[], data: MindReaderResponse) => {
    if (data.action === "guess" && data.guess) {
      setState((prev) => ({
        ...prev,
        phase: "guess",
        history,
        question: null,
        questionNumber: data.questionNumber,
        confidence: data.confidence,
        hunches: data.hunches,
        reaction: data.reaction,
        guess: data.guess,
        error: null,
        submitting: false,
        guessStep: 0,
        retryHistory: null,
      }));
      const wait = suspenseDelay();
      if (wait === 0) {
        setState((prev) => ({ ...prev, guessStep: 2 }));
        return;
      }
      timers.current.push(
        window.setTimeout(() => setState((prev) => ({ ...prev, guessStep: 1 })), wait),
      );
      timers.current.push(
        window.setTimeout(() => setState((prev) => ({ ...prev, guessStep: 2 })), wait * 2),
      );
      return;
    }

    setState((prev) => ({
      ...prev,
      phase: "question",
      history,
      question: data.question,
      questionNumber: data.questionNumber,
      confidence: data.confidence,
      hunches: data.hunches,
      reaction: data.reaction,
      guess: null,
      error: null,
      submitting: false,
      retryHistory: null,
    }));
  }, []);

  const send = useCallback(
    async (history: HistoryEntry[]) => {
      setThinkingLine(THINKING_LINES[0]);
      setState((prev) => ({
        ...prev,
        submitting: true,
        error: null,
        retryHistory: history,
      }));
      try {
        const data = await requestTurn(history);
        applyTurn(history, data);
      } catch (error) {
        const message = error instanceof Error ? error.message : PSYCHIC_GLITCH;
        setState((prev) => ({
          ...prev,
          submitting: false,
          error: message || PSYCHIC_GLITCH,
        }));
      }
    },
    [applyTurn],
  );

  const answerQuestion = useCallback(
    (answer: Answer) => {
      if (state.submitting || state.error || !state.question) {
        return;
      }
      if (state.history.length >= MAX_HISTORY) {
        return;
      }
      const nextHistory: HistoryEntry[] = [
        ...state.history,
        { question: state.question, answer },
      ];
      void send(nextHistory);
    },
    [send, state.error, state.history, state.question, state.submitting],
  );

  useEffect(() => {
    if (state.phase !== "question" || state.submitting || state.error) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      const match = ANSWER_BUTTONS.find((button) => button.shortcut.toLowerCase() === key);
      if (match) {
        event.preventDefault();
        answerQuestion(match.value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answerQuestion, state.error, state.phase, state.submitting]);

  const share = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      return;
    }
    const text =
      state.phase === "won"
        ? `MINDREADER read my mind in ${state.history.length} questions.`
        : "I beat MINDREADER.";
    try {
      await navigator.share({ title: "MINDREADER", text });
    } catch {
      // User cancelled share; ignore.
    }
  }, [state.history.length, state.phase]);

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  const playAgain = useCallback(() => {
    clearTimers();
    setThinkingLine(THINKING_LINES[0]);
    setState({ ...INITIAL_STATE, winLine: pickWinLine() });
  }, [clearTimers]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8 sm:pt-12">
      <header className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-cyan-300/80">
          Transmission
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[0.28em] text-white">MINDREADER</h1>
      </header>

      <main className="flex flex-1 flex-col">
        {state.phase === "welcome" ? (
          <Welcome onStart={() => setState((prev) => ({ ...prev, phase: "think" }))} />
        ) : null}

        {state.phase === "think" ? (
          <Think
            submitting={state.submitting}
            error={state.error}
            onReady={() => void send([])}
            onRetry={() => state.retryHistory && void send(state.retryHistory)}
          />
        ) : null}

        {state.phase === "question" ? (
          <QuestionPhase
            state={state}
            thinkingLine={thinkingLine}
            onAnswer={answerQuestion}
            onRetry={() => state.retryHistory && void send(state.retryHistory)}
          />
        ) : null}

        {state.phase === "guess" ? (
          <GuessPhase
            state={state}
            onYes={() =>
              setState((prev) => ({
                ...prev,
                phase: "won",
                winLine: pickWinLine(),
              }))
            }
            onNo={() => setState((prev) => ({ ...prev, phase: "lost", secret: "", revealed: false }))}
          />
        ) : null}

        {state.phase === "won" ? (
          <WonPhase
            questionsUsed={state.history.length}
            winLine={state.winLine}
            guess={state.guess}
            canShare={canShare}
            onShare={() => void share()}
            onAgain={playAgain}
          />
        ) : null}

        {state.phase === "lost" ? (
          <LostPhase
            state={state}
            canShare={canShare}
            onSecret={(secret) =>
              setState((prev) => ({ ...prev, secret, secretError: null }))
            }
            onReveal={() => {
              const trimmed = state.secret.trim();
              if (!trimmed) {
                setState((prev) => ({ ...prev, secretError: "Type it. I can take it." }));
                return;
              }
              setState((prev) => ({ ...prev, revealed: true, secretError: null, secret: trimmed }));
            }}
            onShare={() => void share()}
            onAgain={playAgain}
          />
        ) : null}

        {state.phase === "think" && state.submitting ? (
          <ThinkingOverlay line={thinkingLine} />
        ) : null}
      </main>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <div className="space-y-3">
        <p className="text-2xl font-medium tracking-tight text-white sm:text-3xl">
          Think of anything.
        </p>
        <p className="text-lg text-zinc-400">I get 10 questions to read your mind.</p>
      </div>
      <Button size="wide" onClick={onStart}>
        START
      </Button>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-500">
        <p>
          Pick a person, place, object, animal, movie, idea — anything. Don&apos;t type it. Just keep
          it in your head.
        </p>
        <p>Be honest with your answers. Changing the answer halfway through ruins the magic.</p>
      </div>
    </div>
  );
}

function Think({
  submitting,
  error,
  onReady,
  onRetry,
}: {
  submitting: boolean;
  error: string | null;
  onReady: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <div className="space-y-3">
        <p className="text-3xl font-medium tracking-tight text-white">Think of something.</p>
        <p className="text-lg text-zinc-400">Got it locked in your head?</p>
      </div>
      {error ? (
        <ErrorCard message={error} onRetry={onRetry} />
      ) : (
        <Button size="wide" onClick={onReady} disabled={submitting}>
          YES — READ MY MIND
        </Button>
      )}
    </div>
  );
}

function QuestionPhase({
  state,
  thinkingLine,
  onAnswer,
  onRetry,
}: {
  state: GameState;
  thinkingLine: string;
  onAnswer: (answer: Answer) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Question {state.questionNumber} / {MAX_HISTORY}
        </p>
        <Progress answered={state.history.length} />
      </div>

      <div className="min-h-24" aria-live="polite">
        {state.submitting ? (
          <p className="text-xl font-medium text-cyan-100">{thinkingLine}</p>
        ) : (
          <p className="text-2xl font-medium leading-snug text-white">{state.question}</p>
        )}
      </div>

      <MindSignal
        confidence={state.confidence}
        hunches={state.hunches}
        reaction={state.reaction}
      />

      {state.error ? (
        <ErrorCard message={state.error} onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ANSWER_BUTTONS.map((button) => (
            <Button
              key={button.value}
              variant="answer"
              onClick={() => onAnswer(button.value)}
              disabled={state.submitting}
              aria-keyshortcuts={button.shortcut}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuessPhase({
  state,
  onYes,
  onNo,
}: {
  state: GameState;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <div className="space-y-4" aria-live="polite">
        {state.guessStep === 0 ? (
          <p className="text-2xl font-medium text-white">I think I&apos;ve got it.</p>
        ) : null}
        {state.guessStep >= 1 ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            You&apos;re thinking of...
          </p>
        ) : null}
        {state.guessStep >= 2 ? (
          <>
            <p className="text-3xl font-semibold tracking-tight text-white">{state.guess}</p>
            <p className="font-mono text-sm text-cyan-300">Confidence {state.confidence}%</p>
          </>
        ) : null}
      </div>
      {state.guessStep >= 2 ? (
        <div className="grid grid-cols-2 gap-3">
          <Button size="wide" onClick={onYes}>
            YES! 🤯
          </Button>
          <Button size="wide" variant="outline" onClick={onNo}>
            NOPE 😏
          </Button>
        </div>
      ) : (
        <div className="h-14" />
      )}
    </div>
  );
}

function WonPhase({
  questionsUsed,
  winLine,
  guess,
  canShare,
  onShare,
  onAgain,
}: {
  questionsUsed: number;
  winLine: string;
  guess: string | null;
  canShare: boolean;
  onShare: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
        I read your mind.
      </p>
      {guess ? <p className="text-2xl font-semibold text-white">{guess}</p> : null}
      <p className="text-zinc-400">
        Questions used: {questionsUsed} / {MAX_HISTORY}
      </p>
      <p className="text-sm italic text-zinc-500">{winLine}</p>
      <Button size="wide" onClick={onAgain}>
        PLAY AGAIN
      </Button>
      {canShare ? (
        <Button variant="ghost" onClick={onShare}>
          Share
        </Button>
      ) : null}
    </div>
  );
}

function LostPhase({
  state,
  canShare,
  onSecret,
  onReveal,
  onShare,
  onAgain,
}: {
  state: GameState;
  canShare: boolean;
  onSecret: (value: string) => void;
  onReveal: () => void;
  onShare: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
        You beat the machine.
      </p>
      {!state.revealed ? (
        <>
          <p className="text-lg text-zinc-300">What were you actually thinking of?</p>
          <Input
            value={state.secret}
            maxLength={MAX_SECRET_CHARS}
            placeholder="Type the secret"
            aria-label="What were you actually thinking of?"
            onChange={(event) => onSecret(event.target.value.slice(0, MAX_SECRET_CHARS))}
          />
          {state.secretError ? (
            <p className="text-sm text-red-300" role="alert">
              {state.secretError}
            </p>
          ) : null}
          <Button size="wide" onClick={onReveal}>
            REVEAL
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">I guessed</p>
            <p className="mt-1 text-lg text-white">{state.guess}</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              You were thinking
            </p>
            <p className="mt-1 text-lg text-cyan-100">{state.secret}</p>
          </div>
          <p className="text-sm text-zinc-500">Respect.</p>
        </div>
      )}
      <Button size="wide" variant={state.revealed ? "default" : "outline"} onClick={onAgain}>
        PLAY AGAIN
      </Button>
      {canShare ? (
        <Button variant="ghost" onClick={onShare}>
          Share
        </Button>
      ) : null}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-center">
      <p className="text-sm text-red-200" role="alert">
        {message || PSYCHIC_GLITCH}
      </p>
      <Button variant="outline" size="wide" onClick={onRetry}>
        TRY AGAIN
      </Button>
    </div>
  );
}

function ThinkingOverlay({ line }: { line: string }) {
  return (
    <div className="mt-8 text-center" aria-live="polite">
      <p className="text-lg text-cyan-100">{line}</p>
      <div className="mt-4 flex justify-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

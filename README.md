# MINDREADER

Think of anything. The game gets 10 questions to read your mind.

## Setup

```bash
npm install
cp .env.example .env.local
# Put your OpenAI key in .env.local
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-5.6-luna
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

If `OPENAI_API_KEY` is empty, the server uses a local demo mind so you can still play. Live OpenAI is used only when a key is present.

## Scripts

```bash
npm test
npm run build
npm run lint
```

`OPENAI_API_KEY` stays on the server. The browser only posts answer history to `POST /api/mindreader`.

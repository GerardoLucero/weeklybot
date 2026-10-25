# Weeklybot

A Telegram bot that checks in on your life every Sunday and builds a picture of your patterns over time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Every Sunday, Weeklybot sends you five questions. You answer them in Telegram at your own pace. Once you have answered all five, the bot processes your answers with AI and sends back a weekly summary: your word of the week, your balance score, the win that mattered most, the pattern behind what blocked you, and one concrete thing to do differently next week.

After four or more weeks, you start getting trend analysis: is your energy improving or declining? What keeps appearing as a win? What keeps blocking you? The bot tells you in plain language.

---

## The five questions

Every Sunday, in order:

1. How was your energy this week overall? (high / medium / low)
2. What is the one thing you are most proud of from this week?
3. What did you intend to do but did not get to?
4. What drained your energy the most this week?
5. On a scale of 1-10, how was your life balance this week?

You answer them whenever you want during the day. The bot waits.

---

## What you get back

After answering all five questions:

```
Weekly summary

Word of the week: Momentum

Balance: ████████░░ 8/10

Win: You shipped the feature that had been blocking the team for two weeks.
     That is not a small thing — it unblocked three other people.

Pattern: The energy drain from meetings is not about the meetings themselves.
         It is about the context-switching before and after them.

For next week: Block 30 minutes after your two longest meetings for notes
               and reset before jumping to the next task.
```

---

## Trend analysis

After 4+ weeks, run `/trends` to get:

- Energy trend (improving / stable / declining) with the pattern behind it
- Balance trend with week-over-week comparison
- Recurring wins — what keeps appearing as a source of pride
- Recurring blockers — the same obstacle showing up in different forms
- One concrete action for the next month based on the patterns

---

## How it works

**Telegram webhook** — Weeklybot uses a Next.js API route as the Telegram webhook endpoint. No long-polling, no background processes. Each message from Telegram triggers a POST to `/api/webhook`, which processes the message, updates the session state in the database, and responds through the Telegram API.

**Conversation state** — The bot tracks which question each user is on. Answers are stored as they come in. When all five are answered, the processing step runs automatically.

**AI processing** — `claude-sonnet-4.6` reads all five answers together and produces the weekly summary: energy trend, win reframed for significance, the pattern behind the blocker (not just a repeat of what you said), balance score, recommendation, and one-word summary.

**Trend analysis** — When you request trends, the bot reads your last 8 weeks of summaries and identifies patterns across the dataset.

---

## Stack

- Next.js 15 (App Router) — webhook handler and dashboard
- Telegram Bot API (`node-telegram-bot-api`)
- Anthropic AI SDK (`@ai-sdk/anthropic`)
- Prisma with SQLite (local) or PostgreSQL (production)
- TypeScript

---

## Getting started

### Prerequisites

- Node.js 20+
- Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- A Telegram bot token — create one via [@BotFather](https://t.me/BotFather) on Telegram

### Install

```bash
git clone https://github.com/GerardoLucero/weeklybot.git
cd weeklybot
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
WEBHOOK_URL=https://your-domain.com/api/webhook
```

### Set up the database

```bash
npm run db:generate
npm run db:push
```

### Register the Telegram webhook

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>/api/webhook"
```

### Run locally (for development)

For local development, use a tunnel to expose your localhost to the internet:

```bash
# Option 1: ngrok
ngrok http 3000

# Option 2: cloudflared
cloudflared tunnel --url http://localhost:3000
```

Then update `WEBHOOK_URL` with the tunnel URL and register the webhook again.

```bash
npm run dev
```

---

## Telegram commands

| Command | Description |
|---|---|
| `/start` | Register and begin receiving Sunday check-ins |
| `/checkin` | Start a check-in manually at any time |
| `/trends` | Get trend analysis across your recent weeks |
| `/stop` | Pause Sunday check-ins |
| `/status` | See your current check-in state |

---

## Deployment

### Vercel (recommended)

```bash
vercel deploy
```

Set all environment variables in your Vercel project settings. After deploying, register the webhook with your production URL:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-project.vercel.app/api/webhook"
```

Vercel is well-suited for this because the webhook handler runs as a serverless function — no always-on server needed.

### Self-hosted

Any Node.js host with a public URL works: Railway, Render, Fly.io. You need `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WEBHOOK_URL`, and `DATABASE_URL`.

---

## API

### POST /api/webhook

Telegram webhook endpoint. Receives all incoming messages and callback queries from Telegram. Not meant to be called directly.

### GET /api/webhook

Returns webhook status and basic bot information.

### GET /dashboard

Web dashboard showing your recent entries and trends (accessible after authentication).

---

## Project structure

```
weeklybot/
├── prisma/
│   └── schema.prisma          User and WeeklyEntry models
├── src/
│   ├── app/
│   │   ├── api/webhook/
│   │   │   └── route.ts       Telegram webhook handler
│   │   └── dashboard/
│   │       └── page.tsx       Web dashboard
│   └── lib/
│       ├── db.ts              Prisma client singleton
│       └── bot-engine.ts      Questions, AI processing, trend analysis, message formatting
├── .env.example
└── README.md
```

---

## Support

Open source, maintained in my spare time. If it was useful and you want to say thanks:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/gerardolucero)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/lucerorios0)

## License

MIT, see [LICENSE](LICENSE).

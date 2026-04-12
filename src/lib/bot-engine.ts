import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export const WEEKLY_QUESTIONS = [
  "How was your energy this week overall? (high / medium / low)",
  "What is the one thing you are most proud of from this week?",
  "What did you intend to do but didn't get to?",
  "What drained your energy the most this week?",
  "On a scale of 1-10, how was your life balance this week?",
]

export interface WeeklyEntry {
  userId: string
  week: string  // ISO date of the Sunday
  answers: string[]
  insights: WeeklyInsights
}

export interface WeeklyInsights {
  energyTrend: string
  winOfTheWeek: string
  blockerPattern: string
  balanceScore: number
  recommendation: string
  oneWordForTheWeek: string
}

export interface TrendAnalysis {
  weeksAnalyzed: number
  energyTrend: 'improving' | 'stable' | 'declining'
  balanceTrend: 'improving' | 'stable' | 'declining'
  recurringWins: string[]
  recurringBlockers: string[]
  insight: string
  actionForNextMonth: string
}

// ─── Process a single week's answers ──────────────────────────────────────

export async function processWeeklyAnswers(
  answers: string[],
  previousEntries?: WeeklyEntry[]
): Promise<WeeklyInsights> {
  const qa = WEEKLY_QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? '(no answer)'}`).join('\n\n')

  const contextSection = previousEntries?.length
    ? `\nPREVIOUS WEEKS CONTEXT:\n${previousEntries.slice(-3).map(e => `Week of ${e.week}: balance=${e.insights.balanceScore}/10, word="${e.insights.oneWordForTheWeek}"`).join('\n')}`
    : ''

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4.6'),
    system: 'You are a thoughtful personal coach analyzing a weekly check-in. Be warm but direct. Return only valid JSON, no markdown.',
    prompt: `Analyze this weekly check-in and extract meaningful insights.

WEEKLY ANSWERS:
${qa}
${contextSection}

Return JSON only:
{
  "energyTrend": "one sentence about their energy this week",
  "winOfTheWeek": "the most meaningful win, rephrased to highlight its significance",
  "blockerPattern": "the core pattern behind what stopped them (not just repeating what they said)",
  "balanceScore": 7,
  "recommendation": "one specific, actionable thing to do differently next week",
  "oneWordForTheWeek": "one word that captures the essence of this week"
}`,
    maxOutputTokens: 400,
  })

  try {
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as WeeklyInsights
  } catch {
    const balanceAnswer = answers[4] ?? '5'
    const balanceScore = parseInt(balanceAnswer.match(/\d+/)?.[0] ?? '5', 10)
    return {
      energyTrend: 'Could not analyze energy trend.',
      winOfTheWeek: answers[1] ?? 'Not provided',
      blockerPattern: answers[2] ?? 'Not provided',
      balanceScore: Math.min(10, Math.max(1, balanceScore)),
      recommendation: 'Review your answers and identify one thing to change next week.',
      oneWordForTheWeek: 'Reflective',
    }
  }
}

// ─── Analyze trends across multiple weeks ─────────────────────────────────

export async function analyzeTrends(entries: WeeklyEntry[]): Promise<TrendAnalysis> {
  if (entries.length < 2) {
    return {
      weeksAnalyzed: entries.length, energyTrend: 'stable', balanceTrend: 'stable',
      recurringWins: [], recurringBlockers: [],
      insight: 'Not enough data yet. Keep checking in weekly to see trends.',
      actionForNextMonth: 'Complete at least 4 weekly check-ins to get meaningful trend analysis.',
    }
  }

  const summary = entries.slice(-8).map(e =>
    `Week ${e.week}: energy="${e.insights.energyTrend}", balance=${e.insights.balanceScore}/10, word="${e.insights.oneWordForTheWeek}", blocker="${e.insights.blockerPattern}"`
  ).join('\n')

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4.6'),
    system: 'You are a personal coach identifying behavioral patterns across weeks. Return only valid JSON, no markdown.',
    prompt: `Analyze these weekly check-ins for patterns.

WEEKLY SUMMARIES (oldest to newest):
${summary}

Return JSON only:
{
  "weeksAnalyzed": ${entries.length},
  "energyTrend": "improving | stable | declining",
  "balanceTrend": "improving | stable | declining",
  "recurringWins": ["patterns that keep appearing as wins"],
  "recurringBlockers": ["patterns that keep blocking progress"],
  "insight": "the most important pattern you see — be specific, not generic",
  "actionForNextMonth": "one concrete change to make based on these patterns"
}`,
    maxOutputTokens: 400,
  })

  try {
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as TrendAnalysis
  } catch {
    const avgBalance = entries.reduce((s, e) => s + e.insights.balanceScore, 0) / entries.length
    return {
      weeksAnalyzed: entries.length, energyTrend: 'stable', balanceTrend: avgBalance >= 7 ? 'improving' : 'declining',
      recurringWins: [], recurringBlockers: [],
      insight: `Average balance score over ${entries.length} weeks: ${avgBalance.toFixed(1)}/10`,
      actionForNextMonth: 'Continue your weekly check-ins to build a clearer picture.',
    }
  }
}

// ─── Format Telegram messages ──────────────────────────────────────────────

export function formatWeeklyPrompt(questionIndex: number, userName?: string): string {
  const greeting = questionIndex === 0
    ? `Hey${userName ? ` ${userName}` : ''}, it's Sunday check-in time.\n\n`
    : ''
  return `${greeting}${WEEKLY_QUESTIONS[questionIndex]}`
}

export function formatInsightMessage(insights: WeeklyInsights): string {
  const scoreBar = '█'.repeat(Math.round(insights.balanceScore)) + '░'.repeat(10 - Math.round(insights.balanceScore))

  return `Weekly summary\n\n` +
    `Word of the week: ${insights.oneWordForTheWeek}\n\n` +
    `Balance: ${scoreBar} ${insights.balanceScore}/10\n\n` +
    `Win: ${insights.winOfTheWeek}\n\n` +
    `Pattern: ${insights.blockerPattern}\n\n` +
    `For next week: ${insights.recommendation}`
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

declare const Deno: {
  env: { get(key: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toDate(v: unknown): Date {
  const d = v ? new Date(String(v)) : new Date(NaN)
  return isNaN(d.getTime()) ? new Date(0) : d
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function normalizeMerchant(raw: string): string {
  // Collapse recurring-charge noise: strip digits, IDs, and whitespace runs.
  return raw
    .replace(/\d+/g, ' ')
    .replace(/[^a-z ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function detectRecurring(
  expenses: Array<Record<string, unknown>>,
  limit = 8
): Array<{ merchant: string; count: number; total: number; last: string }> {
  const buckets: Record<string, { count: number; total: number; lastDate: string; sample: string }> = {}
  expenses.forEach((t) => {
    const raw = String(t.description || '')
    const key = normalizeMerchant(raw)
    if (!key) return
    const b = buckets[key] || { count: 0, total: 0, lastDate: '', sample: raw }
    b.count += 1
    b.total += Math.abs(Number(t.amount) || 0)
    const d = String(t.transaction_date || '')
    if (d > b.lastDate) b.lastDate = d
    buckets[key] = b
  })

  return Object.entries(buckets)
    .filter(([, b]) => b.count >= 3)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([, b]) => ({ merchant: b.sample, count: b.count, total: b.total, last: b.lastDate }))
}

function buildAnalytics(
  transactions: Array<Record<string, unknown>>,
  categoryGroups: Array<Record<string, unknown>>,
  priorYearCategoryTotals: Record<string, unknown> | undefined
) {
  const expenses = transactions.filter((t) => Number(t.amount) < 0)
  const incomes = transactions.filter((t) => Number(t.amount) > 0)

  const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = expenses.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const net = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0

  // Month-by-month totals for income and expenses.
  const monthly: Record<string, { income: number; expenses: number }> = {}
  transactions.forEach((t) => {
    const mk = monthKey(toDate(t.transaction_date))
    const m = monthly[mk] || { income: 0, expenses: 0 }
    if (Number(t.amount) > 0) m.income += Number(t.amount)
    else m.expenses += Math.abs(Number(t.amount))
    monthly[mk] = m
  })
  const monthlyList = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, m]) => `${month}: income $${m.income.toFixed(0)}, expenses $${m.expenses.toFixed(0)}`)

  // Month-by-month spend per group (to expose seasonality / spikes).
  const catToGroup: Record<string, string> = {}
  categoryGroups.forEach((cg) => { catToGroup[String(cg.category_name)] = String(cg.group_name) })

  const groupMonthly: Record<string, Record<string, number>> = {}
  expenses.forEach((t) => {
    const group = catToGroup[String(t.category_1)] || 'Other'
    if (group === 'Other') return
    const mk = monthKey(toDate(t.transaction_date))
    const byMonth = groupMonthly[group] || (groupMonthly[group] = {})
    byMonth[mk] = (byMonth[mk] || 0) + Math.abs(Number(t.amount))
  })
  const groupMonthlyList = Object.entries(groupMonthly).map(([group, byMonth]) =>
    `${group}: ${Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => `${m}=$${v.toFixed(0)}`).join(', ')}`
  )

  const topExpenses = [...expenses]
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
    .slice(0, 10)
    .map((t) => `- ${t.transaction_date} | ${t.description} | $${Math.abs(Number(t.amount)).toFixed(0)} | ${t.category_1 || 'Uncategorized'}`)

  const topIncomes = [...incomes]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((t) => `- ${t.transaction_date} | ${t.description} | $${Number(t.amount).toFixed(0)} | ${t.category_1 || 'Uncategorized'}`)

  const recurring = detectRecurring(expenses)

  return {
    totalIncome,
    totalExpenses,
    net,
    savingsRate,
    monthlyList,
    groupMonthlyList,
    topExpenses,
    topIncomes,
    recurring,
    recurringText: recurring.length
      ? recurring.map((r) => `- ${r.merchant}: ${r.count} charges, $${r.total.toFixed(0)} total, last ${r.last}`).join('\n')
      : 'None detected.',
    priorYearText: priorYearCategoryTotals && Object.keys(priorYearCategoryTotals).length > 0
      ? Object.entries(priorYearCategoryTotals).map(([cat, total]) => `- ${cat}: $${Number(total).toFixed(2)}`).join('\n')
      : 'not available.',
  }
}

function buildPrompt(args: {
  period: string
  budgets: string
  groupTotals: string
  categoryBreakdown: string
  analytics: ReturnType<typeof buildAnalytics>
  transactionsSample: number
}) {
  const { period, budgets, groupTotals, categoryBreakdown, analytics } = args
  return `You are a blunt, numbers-driven financial analyst reviewing this user's spending for the period: ${period}. Do not be encouraging for its own sake — be direct and specific, and ground EVERY claim in the actual numbers below. Never invent categories, merchants, or figures that are not present in the data. Use $ with no decimals.

TOTAL INCOME THIS PERIOD (authoritative — use exactly): $${analytics.totalIncome.toFixed(2)}
TOTAL EXPENSES THIS PERIOD (authoritative — use exactly): $${analytics.totalExpenses.toFixed(2)}
NET: $${analytics.net.toFixed(2)} (SAVINGS RATE: ${analytics.savingsRate.toFixed(1)}%)

BUDGET TARGETS (annual, per group):
${budgets}

ACTUAL SPENDING BY GROUP (annualized monthly target is roughly annual/12):
${groupTotals}

MONTH-BY-MONTH INCOME/EXPENSES (use this to detect trends, seasonality, and spikes):
${analytics.monthlyList.join('\n')}

MONTH-BY-MONTH SPEND BY GROUP (spot the spikes and one-off months):
${analytics.groupMonthlyList.join('\n') || 'No group-level monthly data.'}

CATEGORY BREAKDOWN (sample of ${args.transactionsSample} most recent transactions — use for category-level insight only):
${categoryBreakdown}

TOP EXPENSES THIS PERIOD:
${analytics.topExpenses.join('\n')}

TOP INCOMES THIS PERIOD:
${analytics.topIncomes.join('\n') || 'None.'}

RECURRING CHARGES (3+ occurrences):
${analytics.recurringText}

PRIOR YEAR SPEND BY CATEGORY (for year-over-year comparison):
${analytics.priorYearText}

GOAL: Provide a "Stay on Track" analysis and concrete budget recommendations. The user may have dozens of categories — be selective, prioritize, and do not try to cover everything.
1. Predict which budgets will be exceeded and whether the user will finish the period over/under budget based on current velocity. If monthly data shows a spike, flag whether it is a genuine run-rate change or a one-off.
2. Give 3-4 highly specific, tactical tips grounded in the top expenses and recurring charges above.
3. Pick at most 6 categories that most need a budget decision (biggest overspend risk, biggest YoY change, or biggest spend with no budget at all) and propose a specific suggested monthly budget for each, grounded in this period's spend and the year-over-year trend. Say explicitly if you're raising or lowering it relative to the current target and why.
4. Compute an overall financial health score 0-100 (100 = excellent budget discipline, 0 = badly over budget with no plan) and a short label ("Needs Attention", "On Track", "Excellent", etc.).
5. In the coaching note, reference the savings rate and one concrete number from the analysis.

Keep every field concise — 1-2 sentences max per item. Limit "insights" to at most 5 items, "predictions" to at most 4, and "tacticalAdvice" to at most 4.

Respond ONLY with a single valid JSON object containing ALL of these fields (use empty arrays if nothing to report, but never omit fields):
{
  "status": "on_track|at_risk|over_budget",
  "summary": "1-2 sentence summary of current budget status",
  "headline": "A single punchy sentence on the most important thing this user needs to know",
  "score": 0,
  "scoreLabel": "Short label",
  "predictions": [ { "category": "Category", "prediction": "e.g. Projected to finish $200 over", "severity": "high|medium|low" } ],
  "tacticalAdvice": [ { "title": "Action Title", "advice": "Specific advice", "impact": "Estimated savings" } ],
  "insights": [ { "title": "Short title", "description": "Observation with numbers", "type": "opportunity|warning|success|tip", "impact": "high|medium|low", "actionable": "One concrete next step" } ],
  "quickWins": ["Short actionable suggestion"],
  "suggestedBudgets": [ { "category": "Category", "suggestedMonthly": 0, "reasoning": "One sentence with numbers" } ],
  "coachingNote": "Supportive but firm closing note"
}`
}

function validateInsights(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    throw new Error('Gemini returned invalid insight data')
  }
  const d = data as Record<string, unknown>
  const arr = <T>(v: unknown, def: T[]): T[] => Array.isArray(v) ? v : def
  return {
    status: typeof d.status === 'string' ? d.status : 'at_risk',
    summary: typeof d.summary === 'string' ? d.summary : '',
    headline: typeof d.headline === 'string' ? d.headline : '',
    score: typeof d.score === 'number' ? Math.max(0, Math.min(100, d.score)) : 0,
    scoreLabel: typeof d.scoreLabel === 'string' ? d.scoreLabel : 'Review',
    predictions: arr<Record<string, unknown>>(d.predictions, []).slice(0, 4),
    tacticalAdvice: arr<Record<string, unknown>>(d.tacticalAdvice, []).slice(0, 4),
    insights: arr<Record<string, unknown>>(d.insights, []).slice(0, 5),
    quickWins: arr<unknown>(d.quickWins, []).slice(0, 4),
    suggestedBudgets: arr<Record<string, unknown>>(d.suggestedBudgets, []).slice(0, 6),
    coachingNote: typeof d.coachingNote === 'string' ? d.coachingNote : '',
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    if (!rawBody) throw new Error('Request body is empty')
    let parsedBody: Record<string, unknown>
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      throw new Error('Request body is not valid JSON')
    }
    const { transactions, categoryGroups, budgets, period, priorYearCategoryTotals } = parsedBody

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured')
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('No transactions provided')
    }

    // Filter internal transfers and cap the sample used for the category breakdown.
    const filteredTransactions = transactions.filter(
      (t: Record<string, unknown>) => String(t.category_1 || '').toLowerCase() !== 'account'
    )
    const recentTransactions = filteredTransactions.slice(0, 300)

    const categoryTotals: Record<string, { income: number; expenses: number; count: number }> = {}
    recentTransactions.forEach((t: Record<string, unknown>) => {
      const cat = String(t.category_1 || 'Uncategorized')
      if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expenses: 0, count: 0 }
      categoryTotals[cat].count += 1
      if (Number(t.amount) > 0) categoryTotals[cat].income += Number(t.amount)
      else categoryTotals[cat].expenses += Math.abs(Number(t.amount))
    })

    const catToGroup: Record<string, string> = {}
    ;(categoryGroups as Array<Record<string, unknown>>).forEach((cg) => {
      catToGroup[String(cg.category_name)] = String(cg.group_name)
    })

    const groupTotals: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      const group = catToGroup[cat] || 'Other'
      groupTotals[group] = (groupTotals[group] || 0) + data.expenses
    })

    const budgetList = Array.isArray(budgets)
      ? budgets.map((b: Record<string, unknown>) => `${b.category_name}: $${b.amount}`).join(', ')
      : 'No budgets set'

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, data]) => `- ${cat}: $${data.expenses.toFixed(2)} spent across ${data.count} transactions`)
      .join('\n')

    const groupTotalsText = Object.entries(groupTotals)
      .map(([group, total]) => `- ${group}: $${total.toFixed(2)}`)
      .join('\n')

    const analytics = buildAnalytics(
      filteredTransactions,
      (categoryGroups as Array<Record<string, unknown>>) || [],
      priorYearCategoryTotals as Record<string, unknown> | undefined
    )

    const prompt = buildPrompt({
      period: String(period || 'the selected period'),
      budgets: budgetList,
      groupTotals: groupTotalsText,
      categoryBreakdown,
      analytics,
      transactionsSample: recentTransactions.length,
    })

    // Retry once on malformed output: response_mime_type forces valid JSON, so a
    // failure is rare; the retry uses the same prompt to ride out a bad sample.
    let insights: unknown
    let lastErr: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 16384,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (!response.ok) {
        const errBody = await response.text()
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', message: 'The AI is busy. Wait about a minute and try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw new Error(`Gemini API ${response.status}: ${errBody.slice(0, 500)}`)
      }

      const responseText = await response.text()
      if (!responseText) throw new Error('Gemini returned empty response body')

      let data: Record<string, unknown>
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error('Gemini response body is not valid JSON')
      }

      if (data.error) {
        const geminiError = data.error as { message?: string }
        throw new Error(`Gemini error: ${geminiError.message || JSON.stringify(data.error)}`)
      }

      let aiText: string | undefined
      try {
        const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>
        aiText = candidates?.[0]?.content?.parts?.[0]?.text
      } catch {
        aiText = undefined
      }
      if (!aiText) throw new Error('Gemini returned no text content')

      try {
        // With responseMimeType=json the text should be pure JSON; fall back to
        // brace extraction for models/versions that still wrap in markdown.
        let parsed: unknown
        try {
          parsed = JSON.parse(aiText)
        } catch {
          const match = aiText.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('Gemini response did not contain JSON')
          parsed = JSON.parse(match[0])
        }
        insights = validateInsights(parsed)
        break
      } catch (err) {
        const parseErr = err instanceof Error ? err : new Error(String(err))
        lastErr = parseErr
        console.error('financial-insights parse attempt', attempt, 'failed:', parseErr.message)
      }
    }

    if (!insights) {
      const fallbackErr = lastErr as { message?: string } | undefined
      throw new Error(fallbackErr?.message || 'Gemini returned malformed JSON. Try again.')
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error))
    console.error('financial-insights error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders } })
  }
})

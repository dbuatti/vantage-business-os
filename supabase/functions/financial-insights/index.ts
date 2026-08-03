// @ts-expect-error - Deno runtime environment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

declare const Deno: {
  env: { get(key: string): string | undefined }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    console.log('rawBody length:', rawBody.length, 'first 200:', rawBody.slice(0, 200))
    if (!rawBody) {
      throw new Error('Request body is empty')
    }
    let parsedBody
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      throw new Error('Request body is not valid JSON: ' + rawBody.slice(0, 200))
    }
    const { transactions, categoryGroups, budgets, period, priorYearCategoryTotals } = parsedBody

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Filter out internal transfers
    const filteredTransactions = transactions.filter((t: Record<string, unknown>) => 
      t.category_1?.toLowerCase() !== 'account'
    )
    
    const recentTransactions = filteredTransactions.slice(0, 300)

    // Authoritative totals computed from the FULL filtered set, not the 300-transaction
    // sample below — the sample is only used for the category/merchant breakdown, so it
    // must never be the source of the headline income/expense numbers (a sample skewed
    // toward recent expenses would otherwise make income look artificially tiny).
    const totalIncome = filteredTransactions.reduce((sum: number, t: Record<string, unknown>) => sum + (typeof t.amount === 'number' && t.amount > 0 ? t.amount : 0), 0)
    const totalExpenses = filteredTransactions.reduce((sum: number, t: Record<string, unknown>) => sum + (typeof t.amount === 'number' && t.amount < 0 ? Math.abs(t.amount) : 0), 0)

    // Calculate Category Totals
    const categoryTotals: Record<string, { income: number; expenses: number; count: number }> = {}
    recentTransactions.forEach((t: Record<string, unknown>) => {
      const cat = t.category_1 || 'Uncategorized'
      if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expenses: 0, count: 0 }
      categoryTotals[cat].count++
      if (t.amount > 0) categoryTotals[cat].income += t.amount
      else categoryTotals[cat].expenses += Math.abs(t.amount)
    })

    // Map categories to groups for budget comparison
    const catToGroup: Record<string, string> = {}
    categoryGroups.forEach((cg: Record<string, unknown>) => { catToGroup[cg.category_name] = cg.group_name; });

    const groupTotals: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      const group = catToGroup[cat] || 'Other'
      groupTotals[group] = (groupTotals[group] || 0) + data.expenses
    })

    const budgetList = budgets?.map((b: Record<string, unknown>) => `${b.category_name}: $${b.amount}`).join(', ') || 'No budgets set'

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, data]) => `- ${cat}: $${data.expenses.toFixed(2)} spent across ${data.count} transactions`)
      .join('\n')

    const priorYearBlock = priorYearCategoryTotals && Object.keys(priorYearCategoryTotals).length > 0
      ? `PRIOR YEAR SPEND BY CATEGORY (for year-over-year comparison and budget suggestions):\n${Object.entries(priorYearCategoryTotals as Record<string, number>).map(([cat, total]) => `- ${cat}: $${Number(total).toFixed(2)}`).join('\n')}`
      : 'PRIOR YEAR SPEND BY CATEGORY: not available.'

    const prompt = `You are a blunt, numbers-driven financial analyst reviewing this user's spending for the period: ${period}. Do not be encouraging for its own sake — be direct and specific, and back every claim with the actual numbers given below.

TOTAL INCOME THIS PERIOD (authoritative, use this exact figure — do not recompute it from the category/merchant breakdown below, which is a sample and may not include every income transaction): $${totalIncome.toFixed(2)}
TOTAL EXPENSES THIS PERIOD (authoritative, same caveat): $${totalExpenses.toFixed(2)}

BUDGET TARGETS:
${budgetList}

ACTUAL SPENDING BY GROUP:
${Object.entries(groupTotals).map(([group, total]) => `- ${group}: $${total.toFixed(2)}`).join('\n')}

ACTUAL SPENDING BY CATEGORY (sample of up to 300 most recent transactions — use the authoritative totals above for overall income/expenses, use this section only for category-level breakdown):
${categoryBreakdown}

${priorYearBlock}

RECENT TOP MERCHANTS:
${recentTransactions.filter((t: Record<string, unknown>) => t.amount < 0).slice(0, 10).map((t: Record<string, unknown>) => `- ${t.description}: $${Math.abs(t.amount)}`).join('\n')}

GOAL: Provide a "Stay on Track" analysis and a set of concrete budget recommendations. This user may have dozens of categories — be selective and prioritize, do not try to cover everything.
1. Identify which budgets are at risk of being exceeded, and predict whether the user will finish the period over or under budget based on current velocity.
2. Give 3-4 highly specific, tactical tips to reduce friction in problem areas.
3. Pick at most the 6 categories that most need a budget decision (biggest overspend risk, biggest YoY change, or biggest spend with no budget at all) and propose a specific suggested monthly budget figure for each, grounded in this period's spend and, where prior year data is available, the year-over-year trend — say explicitly if you're raising or lowering it relative to the current budget and why. Skip minor/trivial categories entirely.
4. Compute an overall financial health score from 0-100 (100 = excellent budget discipline, 0 = badly over budget with no plan) and a short label for it (e.g. "Needs Attention", "On Track", "Excellent").

Keep every field concise — 1-2 sentences max per item, no filler. Limit "insights" to at most 5 items and "predictions"/"tacticalAdvice" to at most 4 items each, so the full response stays compact.

Provide your response as a single JSON object with ALL of these fields (use empty arrays if there is genuinely nothing to report, but do not omit fields, and do not exceed the item limits above):
{
  "status": "on_track|at_risk|over_budget",
  "summary": "A 1-2 sentence summary of their current budget status",
  "headline": "A single punchy sentence capturing the most important thing this user needs to know right now",
  "score": 0,
  "scoreLabel": "Short label for the score",
  "predictions": [
    { "category": "Category Name", "prediction": "e.g. Projected to finish $200 over", "severity": "high|medium|low" }
  ],
  "tacticalAdvice": [
    { "title": "Action Title", "advice": "Specific advice", "impact": "Estimated savings" }
  ],
  "insights": [
    { "title": "Short title", "description": "1-2 sentence specific observation with numbers", "type": "opportunity|warning|success|tip", "impact": "high|medium|low", "actionable": "One concrete next step" }
  ],
  "quickWins": ["A short, immediately actionable suggestion", "..."],
  "suggestedBudgets": [
    { "category": "Category Name", "suggestedMonthly": 0, "reasoning": "Why this number, citing actual spend and/or prior year trend, in one sentence" }
  ],
  "coachingNote": "A supportive but firm closing note from the AI coach"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        })
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini API error:', response.status, errBody)
      throw new Error(`Gemini API ${response.status}: ${errBody.slice(0, 500)}`)
    }

    const responseText = await response.text()
    if (!responseText) {
      throw new Error('Gemini returned empty response body')
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('Gemini response body is not valid JSON: ' + responseText.slice(0, 200))
    }

    if (data.error) {
      throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('Gemini returned no text content')
    }

    const jsonMatch = aiText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('Gemini response did not contain JSON')
    }

    let insights
    try {
      insights = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error('Gemini returned malformed JSON (possibly truncated). Try again.')
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('financial-insights error:', error?.message || error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders } })
  }
})
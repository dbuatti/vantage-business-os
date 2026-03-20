// @ts-ignore - Deno runtime environment
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
    const { transactions, categoryGroups, summaryStats } = await req.json()

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Filter out 'Account' category transactions as they are internal transfers
    const filteredTransactions = transactions.filter((t: any) => t.category_1 !== 'Account')
    const recentTransactions = filteredTransactions.slice(0, 200)
    
    const categoryTotals: Record<string, { income: number; expenses: number; count: number }> = {}
    recentTransactions.forEach((t: any) => {
      const cat = t.category_1 || 'Uncategorized'
      if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expenses: 0, count: 0 }
      categoryTotals[cat].count++
      if (t.amount > 0) categoryTotals[cat].income += t.amount
      else categoryTotals[cat].expenses += Math.abs(t.amount)
    })

    const merchantTotals: Record<string, { total: number; count: number }> = {}
    recentTransactions.filter((t: any) => t.amount < 0).forEach((t: any) => {
      const desc = t.description
      if (!merchantTotals[desc]) merchantTotals[desc] = { total: 0, count: 0 }
      merchantTotals[desc].total += Math.abs(t.amount)
      merchantTotals[desc].count++
    })

    const topMerchants = Object.entries(merchantTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([name, data]) => ({ name, ...data }))

    const workTransactions = recentTransactions.filter((t: any) => t.is_work)
    const workIncome = workTransactions.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0)
    const workExpenses = workTransactions.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0)

    const monthlyData: Record<string, { income: number; expenses: number }> = {}
    recentTransactions.forEach((t: any) => {
      const month = t.mmm_yyyy || 'Unknown'
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 }
      if (t.amount > 0) monthlyData[month].income += t.amount
      else monthlyData[month].expenses += Math.abs(t.amount)
    })

    const prompt = `You are a sharp, insightful financial advisor analyzing personal and business finances. Based on the following transaction data, provide actionable insights and recommendations.

FINANCIAL SUMMARY:
- Total Income: $${summaryStats?.totalIncome?.toFixed(2) || 0}
- Total Expenses: $${summaryStats?.totalExpenses?.toFixed(2) || 0}
- Net: $${summaryStats?.net?.toFixed(2) || 0}
- Work Income: $${workIncome.toFixed(2)}
- Work Expenses: $${workExpenses.toFixed(2)}
- Work Net: $${(workIncome - workExpenses).toFixed(2)}
- Total Transactions: ${recentTransactions.length}

SPENDING BY CATEGORY:
${Object.entries(categoryTotals)
  .sort((a, b) => (b[1].expenses) - (a[1].expenses))
  .slice(0, 15)
  .map(([cat, data]) => `- ${cat}: $${data.expenses.toFixed(2)} spent, $${data.income.toFixed(2)} earned (${data.count} transactions)`)
  .join('\n')}

TOP MERCHANTS (by spend):
${topMerchants.map((m, i) => `${i + 1}. ${m.name}: $${m.total.toFixed(2)} (${m.count} transactions)`).join('\n')}

MONTHLY TRENDS:
${Object.entries(monthlyData).slice(-6).map(([month, data]) => `- ${month}: Income $${data.income.toFixed(2)}, Expenses $${data.expenses.toFixed(2)}, Net $${(data.income - data.expenses).toFixed(2)}`).join('\n')}

CATEGORY GROUPS (how categories are organized):
${categoryGroups?.slice(0, 20).map((cg: any) => `- ${cg.category_name} → ${cg.group_name}`).join('\n') || 'No groups configured'}

Provide your response as a JSON object with this exact structure:
{
  "headline": "A punchy one-line summary of their financial health",
  "score": <number 1-100>,
  "scoreLabel": "<Poor|Fair|Good|Great|Excellent>",
  "insights": [
    {
      "title": "Short title",
      "description": "2-3 sentence actionable insight",
      "type": "opportunity|warning|success|tip",
      "impact": "high|medium|low",
      "actionable": "Specific action they should take"
    }
  ],
  "timeInvestmentAdvice": [
    {
      "area": "Area name",
      "advice": "Why they should invest more/why they should invest less here",
      "potentialImpact": "Estimated monthly impact",
      "priority": "high|medium|low"
    }
  ],
  "spendingPatterns": [
    {
      "pattern": "Description of pattern",
      "recommendation": "What to do about it"
    }
  ],
  "quickWins": [
    "Specific, easy-to-implement suggestion 1",
    "Specific, easy-to-implement suggestion 2"
  ]
}

Generate 5-8 insights, 3-5 time investment recommendations, 2-4 spending patterns, and 3-5 quick wins. Be specific to their actual data - reference real categories, merchants, and amounts. Focus on where they should INVEST MORE TIME for maximum financial return.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        })
      }
    )

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', message: 'The AI is currently busy. Please wait about 60 seconds and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[financial-insights] Gemini API error:", errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('No response from Gemini')
    }

    let insights
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error("[financial-insights] JSON parse error:", parseError)
      console.error("[financial-insights] Raw response:", aiText)
      throw new Error('Failed to parse AI response')
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error("[financial-insights] Error:", error)
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
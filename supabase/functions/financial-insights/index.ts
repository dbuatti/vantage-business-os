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
    const { transactions, categoryGroups, budgets, summaryStats, period } = await req.json()

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Filter out internal transfers
    const filteredTransactions = transactions.filter((t: any) => 
      t.category_1?.toLowerCase() !== 'account'
    )
    
    const recentTransactions = filteredTransactions.slice(0, 300)
    
    // Calculate Category Totals
    const categoryTotals: Record<string, { income: number; expenses: number; count: number }> = {}
    recentTransactions.forEach((t: any) => {
      const cat = t.category_1 || 'Uncategorized'
      if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expenses: 0, count: 0 }
      categoryTotals[cat].count++
      if (t.amount > 0) categoryTotals[cat].income += t.amount
      else categoryTotals[cat].expenses += Math.abs(t.amount)
    })

    // Map categories to groups for budget comparison
    const catToGroup: Record<string, string> = {}
    categoryGroups.forEach((cg: any) => { catToGroup[cg.category_name] = cg.group_name; });

    const groupTotals: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      const group = catToGroup[cat] || 'Other'
      groupTotals[group] = (groupTotals[group] || 0) + data.expenses
    })

    const budgetList = budgets?.map((b: any) => `${b.category_name}: $${b.amount}`).join(', ') || 'No budgets set'

    const prompt = `You are a sharp, insightful financial coach. Analyze this user's spending against their budgets for the period: ${period}.

BUDGET TARGETS:
${budgetList}

ACTUAL SPENDING BY GROUP:
${Object.entries(groupTotals).map(([group, total]) => `- ${group}: $${total.toFixed(2)}`).join('\n')}

RECENT TOP MERCHANTS:
${recentTransactions.filter((t: any) => t.amount < 0).slice(0, 10).map((t: any) => `- ${t.description}: $${Math.abs(t.amount)}`).join('\n')}

GOAL: Provide a "Stay on Track" analysis. 
1. Identify which budgets are at risk of being exceeded.
2. Predict if they will finish the period over or under budget based on current velocity.
3. Give 3-4 highly specific, tactical tips to reduce friction in problem areas.

Provide your response as a JSON object:
{
  "status": "on_track|at_risk|over_budget",
  "summary": "A 1-2 sentence summary of their current budget status",
  "predictions": [
    { "category": "Category Name", "prediction": "e.g. Projected to finish $200 over", "severity": "high|medium|low" }
  ],
  "tacticalAdvice": [
    { "title": "Action Title", "advice": "Specific advice", "impact": "Estimated savings" }
  ],
  "coachingNote": "A supportive but firm closing note from the AI coach"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    )

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text
    const insights = JSON.parse(aiText.match(/\{[\s\S]*\}/)[0])

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders } })
  }
})
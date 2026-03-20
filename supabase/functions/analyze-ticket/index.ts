// @ts-ignore - Deno runtime environment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno runtime environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ticketId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Fetch ticket and comments
    const [{ data: ticket }, { data: comments }] = await Promise.all([
      supabaseClient.from('tickets').select('*').eq('id', ticketId).single(),
      supabaseClient.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
    ])

    if (!ticket) throw new Error('Ticket not found')

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const prompt = `You are an expert business consultant and technical support lead. Analyze this support ticket and provide a summary and a suggested solution.

TICKET DETAILS:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}

CONVERSATION HISTORY:
${comments?.map(c => `${c.is_internal ? '[INTERNAL]' : '[PUBLIC]'} ${c.content}`).join('\n') || 'No comments yet.'}

Provide your response as a JSON object:
{
  "summary": "A concise 1-2 sentence summary of the current situation",
  "solution": "A step-by-step suggested solution or next steps",
  "confidence": <number between 0 and 1 representing your confidence in this solution>
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
        })
      }
    )

    const aiData = await response.json()
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text
    const analysis = JSON.parse(aiText.match(/\{[\s\S]*\}/)[0])

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('ticket_ai_analyses')
      .upsert({
        ticket_id: ticketId,
        summary: analysis.summary,
        solution: analysis.solution,
        confidence: analysis.confidence,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) throw saveError

    return new Response(JSON.stringify(savedAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("[analyze-ticket] Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
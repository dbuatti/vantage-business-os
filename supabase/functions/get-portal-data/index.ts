// @ts-ignore - Deno runtime environment
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore - Deno runtime environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    const { token } = await req.json()
    if (!token) throw new Error('Token is required')

    console.log("[get-portal-data] Fetching data for token:", token)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('owner_user_id, company_name, company_email, company_abn')
      .eq('accountant_share_token', token)
      .single()

    if (settingsError || !settings) {
      console.error("[get-portal-data] Invalid token:", token)
      return new Response(JSON.stringify({ error: 'Invalid or expired access link' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = settings.owner_user_id
    console.log("[get-portal-data] Found owner:", userId)

    // Fetch transactions with pagination to bypass 1000 limit
    let allTransactions: any[] = []
    let from = 0
    const step = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .range(from, from + step - 1)

      if (error) throw error
      if (data && data.length > 0) {
        allTransactions = [...allTransactions, ...data]
        console.log(`[get-portal-data] Fetched ${allTransactions.length} transactions so far...`)
        if (data.length < step) hasMore = false
        else from += step
      } else {
        hasMore = false
      }
    }

    const [categoryGroups, accountantSettings] = await Promise.all([
      supabaseAdmin
        .from('category_groups')
        .select('category_name, group_name')
        .eq('user_id', userId),
      supabaseAdmin
        .from('accountant_settings')
        .select('*')
        .eq('owner_user_id', userId)
        .maybeSingle()
    ])

    console.log("[get-portal-data] Success. Returning total transactions:", allTransactions.length)

    return new Response(
      JSON.stringify({
        profile: settings,
        transactions: allTransactions,
        categoryGroups: categoryGroups.data || [],
        accountantSettings: accountantSettings.data || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("[get-portal-data] Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
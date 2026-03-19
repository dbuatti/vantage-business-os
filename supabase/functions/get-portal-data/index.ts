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

    // Initialize Supabase with Service Role Key to bypass RLS for this specific read-only request
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Find the owner of this token
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

    // 2. Fetch all relevant data for this user
    const [transactions, categoryGroups, accountantSettings] = await Promise.all([
      supabaseAdmin
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false }),
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

    return new Response(
      JSON.stringify({
        profile: settings,
        transactions: transactions.data || [],
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
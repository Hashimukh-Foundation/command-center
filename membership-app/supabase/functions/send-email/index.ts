import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_PASS = Deno.env.get('GMAIL_PASS') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
})

const RATES = { 
  admin: 0, treasurer: 250, president: 500, executive: 250, 
  foreman: 200, mentor: 150, general_member: 100 
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. AUTHENTICATION: Check for the clearance token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized: Missing clearance token')

    // Initialize client with the caller's token
    const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify token validity
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized: Invalid clearance')

    // Initialize Admin Client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. AUTHORIZATION: Verify the caller holds Command Clearance
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile || !['admin', 'treasurer'].includes(callerProfile.role)) {
      throw new Error('Access Denied: Command level clearance required for transmission')
    }

    // 3. PROCESS TRANSMISSION: Read payload
    const { type, memberId, amount, month } = await req.json()

    // Fetch Target Operative Auth Data
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(memberId)
    if (userError || !authUser) throw new Error('Target operative not found in Auth system')

    // Fetch Target Operative Profile
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('id', memberId).single()
    if (profileError || !profile) throw new Error('Target operative profile not found')

    const email = authUser.user.email
    const name = profile.full_name || 'Member'
    const firstName = name.split(' ')[0]

    // Date Formatter
    const formatMonth = (m) => {
      if (!m) return 'Current Month';
      if (m.includes('-')) {
         const [y, mo] = m.split('-');
         const d = new Date(y, mo - 1);
         return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
      return m;
    }

    const displayMonth = formatMonth(month);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let subject = ''
    let html = ''

    if (type === 'receipt') {
      subject = `Receipt: Payment Received (${displayMonth})`
      
      html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              
              <h2 style="color: #059669; margin-top: 0; text-align: center;">Payment Successful</h2>
              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;">
              
              <p style="font-size: 16px; color: #374151;">Dear <strong>${name}</strong>,</p>

              <p style="color: #4b5563; line-height: 1.6;">
                  Thank you for your contribution. We have successfully received your payment for 
                  <strong>${displayMonth}</strong>.
              </p>

              <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #065f46; font-size: 14px;">
                      <strong>Amount Received:</strong> ৳${amount || 0}<br>
                      <strong>Date Confirmed:</strong> ${todayStr}
                  </p>
              </div>

              <p style="color: #4b5563; line-height: 1.6;">
                  Thank you for being with <strong>Hashimukh Foundation</strong>.
              </p>

              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Warm Regards,<br>
                  <strong>Hashimukh Foundation</strong>
              </p>
          </div>
      </div>
      `
    } else if (type === 'reminder') {
      subject = `Action Required: Dues for ${displayMonth}`
      
      let expectedAmount = profile.role === 'patron' ? (profile.patron_custom_amount || 0) : (RATES[profile.role] || 0);

      html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border-top: 4px solid #dc2626; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              
              <h2 style="color: #1f2937; margin-top: 0;">Monthly Payment Reminder</h2>
              
              <p style="font-size: 16px; color: #374151;">Hello <strong>${firstName}</strong>,</p>

              <p style="color: #4b5563; line-height: 1.6;">
                  This is a friendly reminder that your monthly payment for 
                  <strong>${displayMonth}</strong> is currently due.
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                  <span style="font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px;">Outstanding Amount</span><br>
                  <span style="font-size: 32px; font-weight: bold; color: #dc2626;">৳${expectedAmount}</span>
              </div>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="margin-top: 0; font-size: 14px; color: #374151; text-transform: uppercase;">Payment Details</h3>
                  <p style="margin-bottom: 10px; font-size: 16px;">
                      <strong>Bkash & Nagad:</strong> <span style="color: #2563eb; font-family: monospace; font-size: 18px;">01731498975</span>
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">
                      <strong>Reference:</strong> Please use your Name or Member ID.
                  </p>
              </div>

              <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                  Please make this payment at your earliest convenience. If you have already paid, please disregard this email.
              </p>

              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  Best Regards,<br>
                  <strong>Hashimukh Foundation</strong>
              </p>
          </div>
      </div>
      `
    }

    await transporter.sendMail({
      from: `"Hashimukh Foundation" <${GMAIL_USER}>`, 
      to: email, 
      subject: subject,
      html: html,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("Transmission Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
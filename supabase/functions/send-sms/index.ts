// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function processTemplate(template: string, data: Record<string, any>) {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        return data[key.trim()] || '';
    });
}

async function sendLowCreditAlert(supabase: any, businessProfile: any) {
    if (businessProfile.sms_low_credit_notified) return;

    try {
        await supabase.functions.invoke('send-email', {
            body: {
                action: 'low_credit_alert',
                balance: businessProfile.sms_credits_balance,
            },
        });
        
        await supabase
            .from('business_profile')
            .update({ sms_low_credit_notified: true })
            .eq('id', businessProfile.id);
            
    } catch (err) {
        console.error('Failed to trigger low credit alert email:', err);
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const body = await req.json();
        const { action, phone, orderId } = body;

        // 1. Check Business Profile
        const { data: profile } = await supabase
            .from('business_profile')
            .select('id, sms_enabled, sms_credits_balance, sms_sender_name, sms_from_number, sms_low_credit_notified')
            .limit(1)
            .single();

        if (!profile?.sms_enabled) {
            return jsonResponse({ message: 'SMS is disabled' });
        }
        if (profile.sms_credits_balance <= 0) {
            return jsonResponse({ error: 'Out of SMS credits' }, 400);
        }

        // 2. Fetch Twilio Settings from Environment Variables
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const defaultFrom = profile.sms_from_number || Deno.env.get('TWILIO_FROM_NUMBER');
        const senderName = profile.sms_sender_name || 'CRM';

        if (!twilioSid || !twilioAuthToken || !defaultFrom) {
             return jsonResponse({ error: 'Twilio is not configured. Missing environment variables.' }, 400);
        }

        let recipientPhone = phone;
        let messageBody = '';
        let targetOrderId = orderId || null;

        // 3. Process actions
        if (action === 'test') {
            if (!recipientPhone) return jsonResponse({ error: 'Phone required for test' }, 400);
            messageBody = `This is a test message from ${senderName}. Your SMS is working correctly!`;
        } 
        else if (action === 'order_confirmation' || action === 'order_refunded') {
            if (!orderId) return jsonResponse({ error: 'orderId required' }, 400);
            
            // Get order details
            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();
                
            if (!order) return jsonResponse({ error: 'Order not found' }, 400);
            
            recipientPhone = order.customer_phone;
            if (!recipientPhone) return jsonResponse({ message: 'No phone number for order' });
            
            // Get SMS Template
            const { data: template } = await supabase
                .from('sms_templates')
                .select('body, active')
                .eq('system_key', action)
                .single();
                
            if (!template || !template.active) return jsonResponse({ message: 'Template inactive or missing' });
            
            // Merge template
            messageBody = processTemplate(template.body, {
                customer_name: order.customer_name,
                order_number: order.order_number,
                business_name: profile.business_name || senderName,
            });
        }
        else {
            return jsonResponse({ error: 'Invalid SMS action' }, 400);
        }

        if (!recipientPhone) {
             return jsonResponse({ error: 'Missing recipient phone' }, 400);
        }

        // Normalize phone number: strip whitespace/dashes/parens, convert UK 0-prefix to +44
        let normalizedPhone = recipientPhone.replace(/[\s\-\(\)]/g, '');
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '+44' + normalizedPhone.slice(1);
        } else if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
        }

        // 4. Send SMS via Twilio using basic auth
        const fromValue = (senderName && /^[a-zA-Z0-9 ]{1,11}$/.test(senderName)) ? senderName.replace(/ /g, '') : defaultFrom;

        const formData = new URLSearchParams();
        formData.append('To', normalizedPhone);
        formData.append('From', fromValue);
        formData.append('Body', messageBody);

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuthToken}`),
            },
            body: formData.toString()
        });

        const twilioData = await twilioRes.json();
        const success = twilioRes.ok || twilioRes.status === 201;

        // 5. Log and Deduct
        if (success) {
            const newBalance = profile.sms_credits_balance - 1;
            
            // Deduct
            await supabase
                .from('business_profile')
                .update({ sms_credits_balance: newBalance })
                .eq('id', profile.id);
                
            // Log insert
            await supabase.from('sms_log').insert({
                order_id: targetOrderId,
                recipient_phone: recipientPhone,
                message_body: messageBody,
                twilio_sid: twilioData.sid || null,
                status: 'sent',
                credits_used: 1
            });
            
            // Check Low Credit Alert
            if (newBalance <= 10 && !profile.sms_low_credit_notified) {
                await sendLowCreditAlert(supabase, profile);
            }
            
            return jsonResponse({ ok: true, creditsRemaining: newBalance, sid: twilioData.sid });
        } else {
            // Log Error
            await supabase.from('sms_log').insert({
                order_id: targetOrderId,
                recipient_phone: recipientPhone,
                message_body: messageBody,
                status: `failed: ${twilioData.message || 'unknown'}`,
                credits_used: 0
            });
            console.error('Twilio Error:', twilioData);
            return jsonResponse({ error: twilioData.message || 'Failed to send SMS via Twilio' }, 500);
        }
        
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('send-sms error:', errMsg, err);
        return jsonResponse({ error: errMsg || 'Internal server error' }, 500);
    }
});

// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function twimlResponse(twiml: string) {
    return new Response(twiml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

        const url = new URL(req.url);
        const callbackType = url.searchParams.get('type');

        // Parse form data from Twilio (x-www-form-urlencoded)
        const formText = await req.text();
        const params = new URLSearchParams(formText);

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CALL STATUS CALLBACK
           Twilio sends this when call state changes
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        if (callbackType === 'status') {
            const callSid = params.get('CallSid');
            const callStatus = params.get('CallStatus'); // completed, busy, no-answer, canceled, failed
            const duration = parseInt(params.get('CallDuration') || '0', 10);
            const to = params.get('To') || '';
            const from = params.get('From') || '';
            const direction = params.get('Direction') || 'inbound';
            const recordingUrl = params.get('RecordingUrl') || null;
            const recordingDuration = parseInt(params.get('RecordingDuration') || '0', 10);

            if (!callSid) {
                return jsonResponse({ ok: true }); // Nothing to log
            }

            // Find the phone number record
            const calledNumber = direction === 'inbound' ? to : from;
            const { data: phoneRecord } = await supabase
                .from('phone_numbers')
                .select('id')
                .eq('phone_number', calledNumber)
                .single();

            if (!phoneRecord) {
                console.log(`No phone record found for ${calledNumber}, skipping log`);
                return jsonResponse({ ok: true });
            }

            // Check if log already exists (update) or create new
            const { data: existing } = await supabase
                .from('phone_call_logs')
                .select('id')
                .eq('twilio_call_sid', callSid)
                .single();

            if (existing) {
                // Update existing log
                await supabase
                    .from('phone_call_logs')
                    .update({
                        status: callStatus || 'completed',
                        duration_seconds: duration,
                        recording_url: recordingUrl,
                        recording_duration_seconds: recordingDuration,
                    })
                    .eq('id', existing.id);
            } else {
                // Create new log entry
                await supabase
                    .from('phone_call_logs')
                    .insert({
                        phone_number_id: phoneRecord.id,
                        direction: direction === 'inbound' ? 'inbound' : 'outbound',
                        from_number: from,
                        to_number: to,
                        status: callStatus || 'completed',
                        duration_seconds: duration,
                        cost_pence: 0, // Included in monthly fee
                        twilio_call_sid: callSid,
                        recording_url: recordingUrl,
                        recording_duration_seconds: recordingDuration,
                    });
            }

            // Update monthly usage summary
            const now = new Date();
            const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            const { data: summary } = await supabase
                .from('phone_usage_summary')
                .select('*')
                .eq('phone_number_id', phoneRecord.id)
                .eq('month', monthStr)
                .single();

            if (summary) {
                const isInbound = direction === 'inbound';
                await supabase
                    .from('phone_usage_summary')
                    .update({
                        total_calls: summary.total_calls + 1,
                        total_duration_seconds: summary.total_duration_seconds + duration,
                        inbound_calls: isInbound ? summary.inbound_calls + 1 : summary.inbound_calls,
                        outbound_calls: isInbound ? summary.outbound_calls : summary.outbound_calls + 1,
                    })
                    .eq('id', summary.id);
            } else {
                await supabase
                    .from('phone_usage_summary')
                    .insert({
                        phone_number_id: phoneRecord.id,
                        month: monthStr,
                        total_calls: 1,
                        total_duration_seconds: duration,
                        total_cost_pence: 0,
                        inbound_calls: direction === 'inbound' ? 1 : 0,
                        outbound_calls: direction === 'outbound' ? 1 : 0,
                    });
            }

            return jsonResponse({ ok: true });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           INCOMING CALL — RETURN TWIML
           Twilio calls this URL when a call comes in
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        const calledNumber = params.get('Called') || params.get('To') || '';
        const callSid = params.get('CallSid') || '';
        const fromNumber = params.get('From') || '';

        // Look up the phone number in our DB
        const { data: phoneRecord } = await supabase
            .from('phone_numbers')
            .select('*')
            .eq('phone_number', calledNumber)
            .single();

        if (!phoneRecord) {
            console.error(`No phone record found for incoming call to ${calledNumber}`);
            return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Sorry, this number is not currently in service.</Say>
    <Hangup/>
</Response>`);
        }

        // Log the incoming call
        await supabase
            .from('phone_call_logs')
            .insert({
                phone_number_id: phoneRecord.id,
                direction: 'inbound',
                from_number: fromNumber,
                to_number: calledNumber,
                status: 'ringing',
                duration_seconds: 0,
                cost_pence: 0,
                twilio_call_sid: callSid,
            });

        // Build TwiML response based on phone number config
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const statusCallback = `${supabaseUrl}/functions/v1/phone-voice?type=status`;

        // Recording attribute
        const recordAttr = phoneRecord.recording_enabled ? ' record="record-from-answer-dual"' : '';

        // If forwarding is enabled and we have a forward_to number
        if (phoneRecord.forward_enabled && phoneRecord.forward_to) {
            const forwardTo = phoneRecord.forward_to;

            // Caller ID attribute
            let callerIdAttr = '';
            if (phoneRecord.pass_caller_id === false) {
                callerIdAttr = ` callerId="${calledNumber}"`;
            }

            // Option A: forward with voicemail fallback
            if (phoneRecord.voicemail_enabled) {
                const greetingUrl = phoneRecord.voicemail_greeting_url || '';
                const greetingTwiml = greetingUrl
                    ? `<Play>${greetingUrl}</Play>`
                    : `<Say voice="alice">The person you are calling is unavailable. Please leave a message after the tone.</Say>`;

                return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial timeout="25" action="${statusCallback}"${recordAttr}${callerIdAttr}>
        <Number statusCallback="${statusCallback}" statusCallbackEvent="initiated ringing answered completed">${forwardTo}</Number>
    </Dial>
    ${greetingTwiml}
    <Record maxLength="120" playBeep="true" action="${statusCallback}" transcribe="false"/>
    <Say voice="alice">Goodbye.</Say>
</Response>`);
            }

            // Option B: simple forward, no voicemail
            return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial timeout="30"${recordAttr}${callerIdAttr}>
        <Number statusCallback="${statusCallback}" statusCallbackEvent="initiated ringing answered completed">${forwardTo}</Number>
    </Dial>
    <Say voice="alice">Sorry, no one is available to take your call. Please try again later.</Say>
</Response>`);
        }

        // No forwarding configured — voicemail only
        if (phoneRecord.voicemail_enabled) {
            const greetingUrl = phoneRecord.voicemail_greeting_url || '';
            const greetingTwiml = greetingUrl
                ? `<Play>${greetingUrl}</Play>`
                : `<Say voice="alice">You have reached our voicemail. Please leave a message after the tone.</Say>`;

            return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${greetingTwiml}
    <Record maxLength="120" playBeep="true" action="${statusCallback}" transcribe="false"/>
    <Say voice="alice">Goodbye.</Say>
</Response>`);
        }

        // Nothing configured — just say sorry
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">This number is not currently accepting calls. Please try again later.</Say>
    <Hangup/>
</Response>`);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('phone-voice error:', errMsg, err);
        // Always return valid TwiML even on error
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">We are experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`);
    }
});

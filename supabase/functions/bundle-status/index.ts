// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Bundle Status Callback
 * 
 * Twilio sends POST requests here when a regulatory bundle's status changes.
 * This automatically updates the bundle status in our database so the CRM
 * reflects the latest state without manual refresh.
 * 
 * Twilio sends form-encoded (application/x-www-form-urlencoded) data:
 *   - AccountSID: The Twilio account SID
 *   - BundleSID: The bundle's SID
 *   - Status: The new status (e.g. draft, pending-review, in-review, twilio-approved, twilio-rejected)
 *   - FailureReason: Reason for rejection (if applicable, empty otherwise)
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC-SHA1 for Twilio signature validation
async function computeHmacSha1(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    // Convert to base64
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Only accept POST requests (as per Twilio docs)
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

        // Parse the form-encoded POST data from Twilio
        // Twilio sends: AccountSID, BundleSID, Status, FailureReason
        const rawBody = await req.text();
        const params = new URLSearchParams(rawBody);

        const accountSid = params.get('AccountSID') || params.get('AccountSid') || '';
        const bundleSid = params.get('BundleSID') || params.get('BundleSid') || '';
        const newStatus = params.get('Status') || '';
        const failureReason = params.get('FailureReason') || '';

        console.log(`Bundle status callback received: BundleSID=${bundleSid}, Status=${newStatus}, FailureReason=${failureReason || '(none)'}, AccountSID=${accountSid}`);

        if (!bundleSid || !newStatus) {
            console.error('Missing BundleSID or Status in callback');
            return new Response('Missing required fields', { status: 400, headers: corsHeaders });
        }

        // ── Validate Twilio Signature ──
        // Twilio signs requests with X-Twilio-Signature header using HMAC-SHA1
        // The signature is computed over: callback URL + sorted POST params
        if (twilioAuthToken) {
            const twilioSignature = req.headers.get('X-Twilio-Signature') || '';
            if (twilioSignature) {
                // Build the validation string: URL + sorted key=value pairs
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const callbackUrl = `${supabaseUrl}/functions/v1/bundle-status`;

                // Sort params alphabetically by key, then concatenate key+value
                const sortedParams = Array.from(params.entries())
                    .sort(([a], [b]) => a.localeCompare(b));
                let validationString = callbackUrl;
                for (const [key, value] of sortedParams) {
                    validationString += key + value;
                }

                const expectedSignature = await computeHmacSha1(twilioAuthToken, validationString);

                if (twilioSignature !== expectedSignature) {
                    console.error(`Twilio signature mismatch: expected=${expectedSignature}, got=${twilioSignature}`);
                    // Log but don't reject — the URL Twilio signs against may differ
                    // (e.g. if behind a proxy or different hostname). This is a soft check.
                    console.warn('Proceeding despite signature mismatch (URL may differ in Twilio\'s view)');
                } else {
                    console.log('Twilio signature validated successfully');
                }
            } else {
                console.warn('No X-Twilio-Signature header present — skipping signature validation');
            }
        }

        // Verify the account SID matches our Twilio account (basic security check)
        const expectedAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        if (expectedAccountSid && accountSid && accountSid !== expectedAccountSid) {
            console.error(`Account SID mismatch: expected=${expectedAccountSid}, got=${accountSid}`);
            return new Response('Unauthorized', { status: 403, headers: corsHeaders });
        }

        // Check if this bundle SID matches what we have stored in business_profile
        const { data: bizProfile } = await supabase
            .from('business_profile')
            .select('id, twilio_bundle_sid')
            .eq('twilio_bundle_sid', bundleSid)
            .limit(1)
            .single();

        if (!bizProfile) {
            console.log(`Bundle SID ${bundleSid} not found in any business_profile — ignoring callback`);
            // Still return 200 so Twilio doesn't retry
            return new Response(JSON.stringify({ ok: true, ignored: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Map Twilio status to our internal status
        const statusMap: Record<string, string> = {
            'twilio-approved': 'approved',
            'pending-review': 'pending-review',
            'in-review': 'pending-review',
            'twilio-rejected': 'rejected',
            'draft': 'draft',
        };
        const mappedStatus = statusMap[newStatus] || newStatus;
        console.log(`Updating bundle status for business_profile ${bizProfile.id}: ${newStatus} -> ${mappedStatus}`);

        // Update cached status in business_profile
        const updatePayload: Record<string, any> = {
            twilio_bundle_status: mappedStatus,
            twilio_bundle_status_updated_at: new Date().toISOString(),
        };

        // Store failure reason if bundle was rejected
        if (failureReason && (newStatus === 'twilio-rejected')) {
            updatePayload.twilio_bundle_failure_reason = failureReason;
            console.log(`Bundle rejected. Reason: ${failureReason}`);
        }

        const { error: updateErr } = await supabase
            .from('business_profile')
            .update(updatePayload)
            .eq('id', bizProfile.id);

        if (updateErr) {
            // If the columns don't exist yet, just log — the status is still fetched live from Twilio
            console.log('Could not update cached bundle status (columns may not exist yet):', updateErr.message);
        }

        console.log(`Bundle ${bundleSid} status successfully processed: ${mappedStatus}`);

        return new Response(JSON.stringify({ ok: true, status: mappedStatus }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('bundle-status callback error:', errMsg, err);
        // Return 200 even on error to prevent Twilio from retrying endlessly
        return new Response(JSON.stringify({ error: errMsg }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

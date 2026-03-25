// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonRes(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SCOPES = 'https://www.googleapis.com/auth/business.manage';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log('google-oauth: received request');
        const body = await req.json();
        const { action } = body;
        console.log('google-oauth: action =', action);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // ─── Action: get_auth_url ──────────────────
        if (action === 'get_auth_url') {
            const { redirect_uri } = body;
            if (!redirect_uri) return jsonRes({ error: 'redirect_uri is required' }, 400);

            const params = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri,
                response_type: 'code',
                scope: SCOPES,
                access_type: 'offline',
                prompt: 'consent',
            });

            return jsonRes({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
        }

        // ─── Action: exchange_code ─────────────────
        if (action === 'exchange_code') {
            const { code, redirect_uri } = body;
            console.log('exchange_code: redirect_uri =', redirect_uri);
            if (!code) return jsonRes({ error: 'Authorization code is required' }, 400);
            if (!redirect_uri) return jsonRes({ error: 'redirect_uri is required' }, 400);

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri,
                    grant_type: 'authorization_code',
                }),
            });

            const tokenData = await tokenRes.json();
            console.log('exchange_code: token response status =', tokenRes.status);
            console.log('exchange_code: has access_token =', !!tokenData.access_token);
            if (tokenData.error) console.log('exchange_code: error =', tokenData.error, tokenData.error_description);

            if (!tokenRes.ok || tokenData.error) {
                return jsonRes({ error: tokenData.error_description || tokenData.error || 'Token exchange failed' }, 400);
            }

            const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

            // Store tokens in google_settings
            const { data: existing, error: fetchErr } = await supabase
                .from('google_settings')
                .select('id')
                .limit(1)
                .single();

            console.log('exchange_code: existing row =', existing?.id, 'fetchErr =', fetchErr?.message);

            const tokenPayload = {
                google_access_token: tokenData.access_token,
                google_refresh_token: tokenData.refresh_token || null,
                google_token_expiry: expiresAt,
                updated_at: new Date().toISOString(),
            };

            if (existing) {
                const { error: upErr } = await supabase
                    .from('google_settings')
                    .update(tokenPayload)
                    .eq('id', existing.id);
                console.log('exchange_code: update result error =', upErr?.message);
            } else {
                const { error: insErr } = await supabase
                    .from('google_settings')
                    .insert({
                        ...tokenPayload,
                        google_place_id: '',
                        google_api_key: '',
                        google_business_name: '',
                        google_review_link: '',
                    });
                console.log('exchange_code: insert result error =', insErr?.message);
            }

            console.log('exchange_code: success');
            return jsonRes({ ok: true });
        }

        // ─── Helper: get valid access token ────────
        async function getAccessToken(): Promise<string> {
            const { data: settings } = await supabase
                .from('google_settings')
                .select('*')
                .limit(1)
                .single();

            if (!settings?.google_access_token) {
                throw new Error('Not connected to Google. Please connect in Settings.');
            }

            // Check if token is expired
            if (settings.google_token_expiry && new Date(settings.google_token_expiry) < new Date()) {
                if (!settings.google_refresh_token) {
                    throw new Error('Google token expired and no refresh token available. Please reconnect.');
                }

                // Refresh the token
                const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        refresh_token: settings.google_refresh_token,
                        grant_type: 'refresh_token',
                    }),
                });

                const refreshData = await refreshRes.json();

                if (!refreshRes.ok || refreshData.error) {
                    throw new Error('Failed to refresh Google token. Please reconnect.');
                }

                const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

                await supabase
                    .from('google_settings')
                    .update({
                        google_access_token: refreshData.access_token,
                        google_token_expiry: newExpiry,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', settings.id);

                return refreshData.access_token;
            }

            return settings.google_access_token;
        }

        // ─── Action: list_accounts ─────────────────
        if (action === 'list_accounts') {
            const accessToken = await getAccessToken();
            console.log('list_accounts: calling Google API...');

            const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            console.log('list_accounts: response status =', res.status);

            if (!res.ok) {
                const errText = await res.text();
                console.log('list_accounts: error body =', errText);
                let errMsg = `Google API returned ${res.status}`;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg = errJson?.error?.message || errMsg;
                } catch { /* ignore */ }
                return jsonRes({ error: errMsg }, 400);
            }

            const data = await res.json();
            console.log('list_accounts: accounts count =', (data.accounts || []).length);
            const accounts = (data.accounts || []).map((a: any) => ({
                name: a.name,
                accountName: a.accountName,
                type: a.type,
            }));

            return jsonRes({ accounts });
        }

        // ─── Action: list_locations ────────────────
        if (action === 'list_locations') {
            const { account_name } = body;
            if (!account_name) return jsonRes({ error: 'account_name is required' }, 400);

            const accessToken = await getAccessToken();

            const res = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${account_name}/locations?readMask=name,title,storefrontAddress,metadata`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                return jsonRes({
                    error: errBody?.error?.message || `Google API returned ${res.status}`,
                }, 400);
            }

            const data = await res.json();
            const locations = (data.locations || []).map((loc: any) => ({
                name: loc.name,       // e.g. "locations/123456"
                title: loc.title,     // business name
                address: [
                    ...(loc.storefrontAddress?.addressLines || []),
                    loc.storefrontAddress?.locality,
                    loc.storefrontAddress?.postalCode,
                ].filter(Boolean).join(', '),
                placeId: loc.metadata?.placeId || null,
            }));

            return jsonRes({ locations });
        }

        // ─── Action: select_location ───────────────
        if (action === 'select_location') {
            const { place_id, business_name, account_name } = body;
            if (!place_id || !business_name) {
                return jsonRes({ error: 'place_id and business_name are required' }, 400);
            }

            const reviewLink = `https://search.google.com/local/writereview?placeid=${place_id}`;

            const { data: existing } = await supabase
                .from('google_settings')
                .select('id')
                .limit(1)
                .single();

            const payload = {
                google_place_id: place_id,
                google_business_name: business_name,
                google_review_link: reviewLink,
                google_account_name: account_name || null,
                updated_at: new Date().toISOString(),
            };

            if (existing) {
                await supabase
                    .from('google_settings')
                    .update(payload)
                    .eq('id', existing.id);
            }

            return jsonRes({ ok: true });
        }

        // ─── Action: disconnect ────────────────────
        if (action === 'disconnect') {
            const { data: existing } = await supabase
                .from('google_settings')
                .select('id, google_access_token')
                .limit(1)
                .single();

            if (existing) {
                // Try to revoke the token
                if (existing.google_access_token) {
                    try {
                        await fetch(`https://oauth2.googleapis.com/revoke?token=${existing.google_access_token}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        });
                    } catch { /* ignore revoke errors */ }
                }

                await supabase
                    .from('google_settings')
                    .update({
                        google_place_id: '',
                        google_business_name: '',
                        google_review_link: '',
                        google_access_token: null,
                        google_refresh_token: null,
                        google_token_expiry: null,
                        google_account_name: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            }

            return jsonRes({ ok: true });
        }

        return jsonRes({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('google-oauth error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

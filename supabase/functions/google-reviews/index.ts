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

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action } = body;

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
        if (!apiKey) {
            return jsonRes({ error: 'GOOGLE_PLACES_API_KEY secret is not set in Supabase. Please configure it in your Edge Function secrets.' }, 500);
        }

        // ─── Action: search_places ──────────────────
        if (action === 'search_places') {
            const { query } = body;
            if (!query) return jsonRes({ error: 'Search query is required' }, 400);

            const url = `https://places.googleapis.com/v1/places:searchText`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
                },
                body: JSON.stringify({ textQuery: query }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                return jsonRes({ error: errBody?.error?.message || `Google API returned ${res.status}` }, 400);
            }

            const data = await res.json();
            const places = (data.places || []).map((p: any) => ({
                id: p.id,
                name: p.displayName?.text || '',
                address: p.formattedAddress || ''
            }));
            
            return jsonRes({ places });
        }

        // --- Actions requiring Google Settings ---
        // Read Google settings from the singleton table
        const { data: settings, error: settingsErr } = await supabase
            .from('google_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (settingsErr || !settings || !settings.google_place_id) {
            return jsonRes({ error: 'Google Place ID is missing. Please connect your business in Settings.' }, 400);
        }

        const placeId = settings.google_place_id;

        // ─── Action: test_connection ────────────────
        if (action === 'test_connection') {
            const url = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName&key=${apiKey}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody?.error?.message || `Google API returned ${res.status}`;
                return jsonRes({ error: msg }, 400);
            }

            const data = await res.json();
            return jsonRes({
                ok: true,
                displayName: data?.displayName?.text || 'Unknown',
            });
        }

        // ─── Action: fetch_reviews ──────────────────
        if (action === 'fetch_reviews') {
            const url = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,rating,userRatingCount,reviews&key=${apiKey}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody?.error?.message || `Google API returned ${res.status}`;
                return jsonRes({ error: msg }, 400);
            }

            const data = await res.json();

            // Map reviews to a clean format
            const reviews = (data.reviews || []).map((r: any) => ({
                authorName: r.authorAttribution?.displayName || 'Anonymous',
                authorPhotoUri: r.authorAttribution?.photoUri || null,
                rating: r.rating || 0,
                text: r.text?.text || '',
                relativePublishTimeDescription: r.relativePublishTimeDescription || '',
                publishTime: r.publishTime || '',
            }));

            return jsonRes({
                displayName: data?.displayName?.text || 'Unknown',
                rating: data?.rating || 0,
                userRatingCount: data?.userRatingCount || 0,
                reviews,
            });
        }

        return jsonRes({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('google-reviews error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

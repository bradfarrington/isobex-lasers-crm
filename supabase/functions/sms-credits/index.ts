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

const CREDIT_PACKAGES = [
    { credits: 50, pricePence: 500, label: '50 credits — £5.00' },
    { credits: 100, pricePence: 1000, label: '100 credits — £10.00' },
    { credits: 250, pricePence: 2500, label: '250 credits — £25.00' },
    { credits: 500, pricePence: 5000, label: '500 credits — £50.00' },
];

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
        const { action } = body;

        /* ━━━ GET PACKAGES ━━━ */
        if (action === 'getPackages') {
            const { data: profile } = await supabase
                .from('business_profile')
                .select('sms_credits_balance')
                .limit(1)
                .single();

            const { data: purchases } = await supabase
                .from('sms_credit_purchases')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(20);

            return jsonResponse({
                packages: CREDIT_PACKAGES,
                balance: profile?.sms_credits_balance || 0,
                purchases: purchases || [],
            });
        }

        /* ━━━ CREATE CHECKOUT SESSION ━━━ */
        if (action === 'createCheckout') {
            // Use the PLATFORM Stripe key (Brad's account) — not the customer's store Stripe key.
            // SMS credits are a service sold by the platform, so revenue goes to the platform account.
            const STRIPE_SECRET_KEY = Deno.env.get('PLATFORM_STRIPE_SECRET_KEY');

            if (!STRIPE_SECRET_KEY) {
                return jsonResponse({ error: 'Platform Stripe is not configured. Contact support.' }, 400);
            }

            const { credits } = body;
            const pkg = CREDIT_PACKAGES.find(p => p.credits === credits);
            if (!pkg) {
                return jsonResponse({ error: 'Invalid credit package' }, 400);
            }

            const { successUrl, cancelUrl } = body;
            const checkoutBody = new URLSearchParams({
                'mode': 'payment',
                'payment_method_types[0]': 'card',
                'line_items[0][price_data][currency]': 'gbp',
                'line_items[0][price_data][unit_amount]': String(pkg.pricePence),
                'line_items[0][price_data][product_data][name]': `${pkg.credits} SMS Credits`,
                'line_items[0][price_data][product_data][description]': `Top up your SMS notification credits`,
                'line_items[0][quantity]': '1',
                'metadata[credits]': String(pkg.credits),
                'success_url': successUrl,
                'cancel_url': cancelUrl,
            });

            const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: checkoutBody.toString(),
            });

            const stripeData = await stripeRes.json();

            if (!stripeRes.ok) {
                console.error('Stripe checkout error:', stripeData);
                return jsonResponse({ error: stripeData.error?.message || 'Failed to create checkout session' }, 400);
            }

            return jsonResponse({
                ok: true,
                checkoutUrl: stripeData.url,
                sessionId: stripeData.id,
            });
        }

        /* ━━━ GET BALANCE ━━━ */
        if (action === 'getBalance') {
            const { data: profile } = await supabase
                .from('business_profile')
                .select('sms_credits_balance, sms_enabled, sms_sender_name')
                .limit(1)
                .single();

            return jsonResponse({
                balance: profile?.sms_credits_balance || 0,
                enabled: profile?.sms_enabled || false,
                senderName: profile?.sms_sender_name || '',
            });
        }

        return jsonResponse({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('sms-credits error:', errMsg, err);
        return jsonResponse({ error: errMsg || 'Internal server error' }, 500);
    }
});

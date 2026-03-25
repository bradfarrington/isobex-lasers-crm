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

// Helper to deduct inventory for order items
async function deductInventory(supabase: any, orderId: string) {
    const { data: items } = await supabase
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', orderId);

    if (!items || items.length === 0) return;

    for (const item of items) {
        if (item.variant_id) {
            // Deduct from variant stock
            const { data: variant } = await supabase
                .from('product_variants')
                .select('stock_quantity')
                .eq('id', item.variant_id)
                .single();

            if (variant) {
                await supabase
                    .from('product_variants')
                    .update({ stock_quantity: Math.max(0, (variant.stock_quantity || 0) - item.quantity) })
                    .eq('id', item.variant_id);
            }
        } else if (item.product_id) {
            // Deduct from product stock
            const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

            if (product) {
                await supabase
                    .from('products')
                    .update({ stock_quantity: Math.max(0, (product.stock_quantity || 0) - item.quantity) })
                    .eq('id', item.product_id);
            }
        }
    }
}

// Helper to restore inventory for refunded order items
async function restoreInventory(supabase: any, orderId: string) {
    const { data: items } = await supabase
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', orderId);

    if (!items || items.length === 0) return;

    for (const item of items) {
        if (item.variant_id) {
            const { data: variant } = await supabase
                .from('product_variants')
                .select('stock_quantity')
                .eq('id', item.variant_id)
                .single();

            if (variant) {
                await supabase
                    .from('product_variants')
                    .update({ stock_quantity: (variant.stock_quantity || 0) + item.quantity })
                    .eq('id', item.variant_id);
            }
        } else if (item.product_id) {
            const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

            if (product) {
                await supabase
                    .from('products')
                    .update({ stock_quantity: (product.stock_quantity || 0) + item.quantity })
                    .eq('id', item.product_id);
            }
        }
    }
}

// Helper to trigger email via send-email function
async function triggerEmail(supabase: any, action: string, orderId: string) {
    try {
        await supabase.functions.invoke('send-email', {
            body: { action, orderId },
        });
    } catch (err) {
        console.error(`Failed to trigger ${action} email:`, err);
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // Read Stripe webhook secret from stripe_settings
        const { data: settings } = await supabase
            .from('stripe_settings')
            .select('stripe_webhook_secret')
            .limit(1)
            .single();

        const webhookSecret = settings?.stripe_webhook_secret;

        // Get the raw body for signature verification
        const rawBody = await req.text();
        const sig = req.headers.get('stripe-signature');

        // If we have a webhook secret and signature, verify
        if (webhookSecret && sig) {
            // Simple Stripe signature verification using crypto
            const parts = sig.split(',');
            const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
            const v1Signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.split('=')[1]);

            if (!timestamp || v1Signatures.length === 0) {
                return jsonRes({ error: 'Invalid signature format' }, 400);
            }

            const payload = `${timestamp}.${rawBody}`;
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(webhookSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign'],
            );
            const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
            const expectedSig = Array.from(new Uint8Array(signatureBytes))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            if (!v1Signatures.includes(expectedSig)) {
                return jsonRes({ error: 'Invalid webhook signature' }, 400);
            }

            // Check timestamp tolerance (5 minutes)
            const tolerance = 300;
            const now = Math.floor(Date.now() / 1000);
            if (Math.abs(now - Number(timestamp)) > tolerance) {
                return jsonRes({ error: 'Webhook timestamp too old' }, 400);
            }
        }

        const event = JSON.parse(rawBody);
        const eventType = event.type;

        // Handle payment_intent.succeeded
        if (eventType === 'payment_intent.succeeded') {
            const intent = event.data.object;
            const orderId = intent.metadata?.order_id;

            if (!orderId) {
                console.log('No order_id in metadata, skipping');
                return jsonRes({ received: true });
            }

            // Update order status
            await supabase
                .from('orders')
                .update({
                    status: 'paid',
                    payment_status: 'paid',
                    payment_intent_id: intent.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

            // Deduct inventory
            await deductInventory(supabase, orderId);

            // Send order confirmation + invoice emails
            await triggerEmail(supabase, 'send_order_confirmation', orderId);
            await triggerEmail(supabase, 'send_invoice', orderId);

            return jsonRes({ received: true });
        }

        // Handle charge.refunded
        if (eventType === 'charge.refunded') {
            const charge = event.data.object;
            const paymentIntentId = charge.payment_intent;

            if (!paymentIntentId) {
                return jsonRes({ received: true });
            }

            // Find the order by payment_intent_id
            const { data: order } = await supabase
                .from('orders')
                .select('id')
                .eq('payment_intent_id', paymentIntentId)
                .single();

            if (!order) {
                console.log('No order found for payment_intent:', paymentIntentId);
                return jsonRes({ received: true });
            }

            // Check if fully refunded
            const isFullRefund = charge.refunded === true;

            if (isFullRefund) {
                await supabase
                    .from('orders')
                    .update({
                        status: 'refunded',
                        payment_status: 'refunded',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', order.id);

                // Restore inventory
                await restoreInventory(supabase, order.id);

                // Send refund confirmation email
                await triggerEmail(supabase, 'send_refund_confirmation', order.id);
            }

            return jsonRes({ received: true });
        }

        // Other event types — acknowledge but ignore
        return jsonRes({ received: true });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('stripe-webhook error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

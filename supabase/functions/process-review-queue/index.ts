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
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        // 1. Fetch automation settings
        const { data: settings, error: settingsErr } = await supabase
            .from('review_automation_settings')
            .select('*')
            .limit(1)
            .single();

        if (settingsErr || !settings) {
            return jsonRes({ skipped: true, reason: 'No automation settings found' });
        }

        if (!settings.enabled) {
            return jsonRes({ skipped: true, reason: 'Automation is disabled' });
        }

        const now = new Date();
        let created = 0;
        let followedUp = 0;
        let completed = 0;

        // ─── Step A: Create new review requests for eligible orders ───
        // Find paid orders older than initial_delay_days that have no automated review request
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - settings.initial_delay_days);

        const { data: eligibleOrders } = await supabase
            .from('orders')
            .select('id, contact_id, customer_email, customer_name')
            .eq('status', 'paid')
            .lte('created_at', cutoffDate.toISOString())
            .not('customer_email', 'is', null);

        if (eligibleOrders && eligibleOrders.length > 0) {
            // Get existing automated requests to avoid duplicates
            const orderIds = eligibleOrders.map((o: any) => o.id);
            const { data: existingRequests } = await supabase
                .from('review_requests')
                .select('order_id')
                .eq('source', 'automated')
                .in('order_id', orderIds);

            const existingOrderIds = new Set((existingRequests || []).map((r: any) => r.order_id));

            for (const order of eligibleOrders) {
                if (existingOrderIds.has(order.id)) continue;
                if (!order.customer_email) continue;

                // Calculate when the next follow-up should be sent
                const nextSendAt = new Date(now);
                nextSendAt.setDate(nextSendAt.getDate() + settings.follow_up_interval_days);

                // Create the review request
                const { data: newRequest, error: createErr } = await supabase
                    .from('review_requests')
                    .insert({
                        contact_id: order.contact_id || null,
                        contact_email: order.customer_email,
                        contact_name: order.customer_name || 'Customer',
                        status: 'sent',
                        order_id: order.id,
                        source: 'automated',
                        send_count: 1,
                        next_send_at: nextSendAt.toISOString(),
                        sequence_completed: false,
                        last_sent_at: now.toISOString(),
                    })
                    .select()
                    .single();

                if (createErr) {
                    console.error(`Failed to create review request for order ${order.id}:`, createErr);
                    continue;
                }

                // Send the email via the existing send-email function
                try {
                    await supabase.functions.invoke('send-email', {
                        body: { action: 'send_review_request', requestId: newRequest.id, templateId: settings.template_id },
                    });
                    created++;
                } catch (sendErr) {
                    console.error(`Failed to send review email for request ${newRequest.id}:`, sendErr);
                }
            }
        }

        // ─── Step B: Process follow-ups for existing requests ─────────
        const { data: pendingFollowUps } = await supabase
            .from('review_requests')
            .select('*')
            .eq('source', 'automated')
            .eq('sequence_completed', false)
            .neq('status', 'clicked')
            .lte('next_send_at', now.toISOString())
            .gt('send_count', 0); // Already sent at least once

        if (pendingFollowUps && pendingFollowUps.length > 0) {
            for (const request of pendingFollowUps) {
                // Check if we've hit the max follow-ups
                // send_count includes the initial send, so max_follow_ups + 1 total sends
                if (request.send_count >= settings.max_follow_ups + 1) {
                    await supabase
                        .from('review_requests')
                        .update({ sequence_completed: true })
                        .eq('id', request.id);
                    completed++;
                    continue;
                }

                // If stop_on_click is enabled and status is 'clicked', skip
                if (settings.stop_on_click && request.status === 'clicked') {
                    await supabase
                        .from('review_requests')
                        .update({ sequence_completed: true })
                        .eq('id', request.id);
                    completed++;
                    continue;
                }

                // Send follow-up email
                try {
                    await supabase.functions.invoke('send-email', {
                        body: { action: 'send_review_request', requestId: request.id, templateId: settings.template_id },
                    });

                    const newSendCount = request.send_count + 1;
                    const isLastSend = newSendCount >= settings.max_follow_ups + 1;

                    const nextSendAt = new Date(now);
                    nextSendAt.setDate(nextSendAt.getDate() + settings.follow_up_interval_days);

                    await supabase
                        .from('review_requests')
                        .update({
                            send_count: newSendCount,
                            last_sent_at: now.toISOString(),
                            next_send_at: isLastSend ? null : nextSendAt.toISOString(),
                            sequence_completed: isLastSend,
                        })
                        .eq('id', request.id);

                    if (isLastSend) {
                        completed++;
                    } else {
                        followedUp++;
                    }
                } catch (sendErr) {
                    console.error(`Failed to send follow-up for request ${request.id}:`, sendErr);
                }
            }
        }

        return jsonRes({
            ok: true,
            created,
            followedUp,
            completed,
            timestamp: now.toISOString(),
        });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('process-review-queue error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

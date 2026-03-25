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

        // Read SMTP config from smtp_settings singleton
        const { data: settings, error: settingsErr } = await supabase
            .from('smtp_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (settingsErr || !settings) {
            return jsonRes({ error: 'SMTP settings not found. Go to Settings → Email / SMTP to configure.' }, 400);
        }

        if (!settings.smtp_configured || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
            return jsonRes({ error: 'SMTP is not configured. Go to Settings → Email / SMTP to set it up.' }, 400);
        }

        // Dynamically import denomailer (avoids top-level import crash)
        const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');

        const client = new SMTPClient({
            connection: {
                hostname: settings.smtp_host,
                port: Number(settings.smtp_port) || 587,
                tls: settings.smtp_secure !== false,
                auth: {
                    username: settings.smtp_user,
                    password: settings.smtp_pass,
                },
            },
        });

        const fromAddress = `${settings.smtp_from_name || 'Isobex Lasers'} <${settings.smtp_user}>`;
        const replyTo = settings.smtp_reply_to || undefined;

        // Helper: encode HTML as base64 mime to avoid encoding artifacts
        function htmlMime(html: string) {
            const encoded = btoa(unescape(encodeURIComponent(html.trim())));
            const wrapped = encoded.replace(/.{1,76}/g, '$&\r\n');
            return [{ mimeType: 'text/html; charset="utf-8"', content: wrapped, transferEncoding: 'base64' }];
        }

        // ─── Action: test ────────────────────────────
        if (action === 'test') {
            const recipient = body.to || settings.smtp_reply_to;
            if (!recipient) {
                return jsonRes({ error: 'No recipient email address provided' }, 400);
            }

            const testHtml = '<div style="font-family:Helvetica,Arial,sans-serif;padding:30px;max-width:500px;margin:auto;"><h2 style="color:#dc2626;">✓ SMTP Test Successful</h2><p>Your email settings are configured correctly.</p><p style="color:#888;font-size:13px;">Sent from Isobex Lasers CRM</p></div>';
            await client.send({
                from: fromAddress,
                to: recipient,
                subject: 'Test Email — Isobex Lasers CRM',
                mimeContent: htmlMime(testHtml),
            });

            await client.close();
            return jsonRes({ ok: true });
        }

        // ─── Action: test_builder ────────────────────
        if (action === 'test_builder') {
            const { html, subject, toEmail } = body;
            if (!toEmail) return jsonRes({ error: 'Recipient email (toEmail) is required' }, 400);
            if (!html) return jsonRes({ error: 'Email HTML content is required' }, 400);

            await client.send({
                from: fromAddress,
                to: toEmail,
                subject: subject || 'Test Email',
                mimeContent: htmlMime(html),
                replyTo,
            });

            await client.close();
            return jsonRes({ ok: true, sentTo: toEmail });
        }

        // ─── Action: send_order_confirmation ─────────
        if (action === 'send_order_confirmation') {
            const { orderId } = body;
            if (!orderId) return jsonRes({ error: 'orderId is required' }, 400);

            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*, contact:contacts(first_name, last_name, email)')
                .eq('id', orderId)
                .single();

            if (orderErr || !order) return jsonRes({ error: 'Order not found' }, 400);
            const clientEmail = order.contact?.email;
            if (!clientEmail) return jsonRes({ error: 'Customer has no email address' }, 400);

            const clientName = `${order.contact?.first_name || ''} ${order.contact?.last_name || ''}`.trim() || 'Customer';
            const orderNumber = order.order_number || order.id.slice(0, 8).toUpperCase();
            const total = Number(order.total || 0).toFixed(2);

            const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">${settings.smtp_from_name || 'Isobex Lasers'}</h1></div><div style="padding:30px 20px;"><h2 style="margin-top:0;color:#dc2626;">Order Confirmed ✓</h2><p>Hi ${clientName},</p><p>Thank you for your order. Here are the details:</p><div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;"><p style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Order Number</p><p style="color:#dc2626;font-weight:bold;margin:0 0 16px;">#${orderNumber}</p><p style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Total</p><p style="color:#dc2626;font-weight:bold;margin:0;">£${total}</p></div><p style="font-size:13px;color:#888;">If you have any questions about your order, please don't hesitate to get in touch.</p></div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">${settings.smtp_from_name || 'Isobex Lasers'}</p></div></div></body></html>`;

            await client.send({ from: fromAddress, to: clientEmail, subject: `Order Confirmation — #${orderNumber}`, mimeContent: htmlMime(emailHtml), replyTo });
            await client.close();
            return jsonRes({ ok: true, sentTo: clientEmail });
        }

        // ─── Action: send_invoice ────────────────────
        if (action === 'send_invoice') {
            const { orderId } = body;
            if (!orderId) return jsonRes({ error: 'orderId is required' }, 400);

            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*, contact:contacts(first_name, last_name, email), items:order_items(product_name, quantity, unit_price)')
                .eq('id', orderId)
                .single();

            if (orderErr || !order) return jsonRes({ error: 'Order not found' }, 400);
            const clientEmail = order.contact?.email;
            if (!clientEmail) return jsonRes({ error: 'Customer has no email address' }, 400);

            const clientName = `${order.contact?.first_name || ''} ${order.contact?.last_name || ''}`.trim() || 'Customer';
            const orderNumber = order.order_number || order.id.slice(0, 8).toUpperCase();
            const total = Number(order.total || 0).toFixed(2);

            const itemRows = (order.items || []).map((item: { product_name: string; quantity: number; unit_price: number }) =>
                `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.product_name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">£${Number(item.unit_price || 0).toFixed(2)}</td></tr>`
            ).join('');

            const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">${settings.smtp_from_name || 'Isobex Lasers'}</h1></div><div style="padding:30px 20px;"><h2 style="margin-top:0;color:#1a1a1a;">Invoice</h2><p>Hi ${clientName},</p><p>Please find your invoice below for order <strong>#${orderNumber}</strong>.</p><table style="width:100%;border-collapse:collapse;margin:20px 0;"><thead><tr style="background:#f9fafb;"><th style="padding:8px 12px;text-align:left;font-size:13px;color:#888;text-transform:uppercase;">Item</th><th style="padding:8px 12px;text-align:center;font-size:13px;color:#888;text-transform:uppercase;">Qty</th><th style="padding:8px 12px;text-align:right;font-size:13px;color:#888;text-transform:uppercase;">Price</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr><td colspan="2" style="padding:12px;text-align:right;font-weight:bold;">Total</td><td style="padding:12px;text-align:right;font-weight:bold;color:#dc2626;">£${total}</td></tr></tfoot></table><p style="font-size:13px;color:#888;">Thank you for your business.</p></div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">${settings.smtp_from_name || 'Isobex Lasers'}</p></div></div></body></html>`;

            await client.send({ from: fromAddress, to: clientEmail, subject: `Invoice — Order #${orderNumber}`, mimeContent: htmlMime(emailHtml), replyTo });
            await client.close();
            return jsonRes({ ok: true, sentTo: clientEmail });
        }

        // ─── Action: send_campaign ───────────────
        if (action === 'send_campaign') {
            const { campaignId } = body;
            if (!campaignId) return jsonRes({ error: 'campaignId is required' }, 400);

            // 1. Fetch campaign
            const { data: campaign, error: campErr } = await supabase
                .from('email_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();
            if (campErr || !campaign) return jsonRes({ error: 'Campaign not found' }, 400);
            if (!campaign.html_content) return jsonRes({ error: 'Campaign has no HTML content. Build the email first.' }, 400);

            // 2. Mark campaign as sending
            await supabase.from('email_campaigns').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', campaignId);

            // 3. Fetch business profile
            const { data: bpData } = await supabase.from('business_profile').select('*').limit(1).single();
            const bp = bpData || {};

            // Build business address string
            const addrParts = [bp.business_address_line_1, bp.business_address_line_2, bp.business_city, bp.business_county, bp.business_postcode, bp.business_country].filter(Boolean);
            const businessAddress = addrParts.join(', ');

            // 4. Fetch pending recipients with contact + company
            const { data: recipients, error: recipErr } = await supabase
                .from('campaign_recipients')
                .select('*, contact:contacts(*, company:companies(*))')
                .eq('campaign_id', campaignId)
                .eq('status', 'pending');
            if (recipErr) return jsonRes({ error: `Failed to fetch recipients: ${recipErr.message}` }, 500);
            if (!recipients || recipients.length === 0) return jsonRes({ error: 'No pending recipients to send to.' }, 400);

            // Get the site URL for unsubscribe links
            const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') || 'http://localhost:5173';

            // 5. Send to each recipient
            let sentCount = 0;
            let failCount = 0;
            const batchSize = campaign.batch_size || 50;
            const batchInterval = campaign.batch_interval || 1000; // ms between batches

            for (let i = 0; i < recipients.length; i++) {
                const r = recipients[i];
                const contact = r.contact || {};
                const company = contact.company || {};

                try {
                    // Replace merge tags with real data
                    const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
                    const unsubToken = btoa(contact.id || r.contact_id || r.email);
                    const unsubLink = `${siteUrl}/unsubscribe/${unsubToken}`;

                    const tagMap: Record<string, string> = {
                        '{{contact_name}}': contactName || r.email,
                        '{{contact_first_name}}': contact.first_name || '',
                        '{{contact_last_name}}': contact.last_name || '',
                        '{{contact_email}}': contact.email || r.email,
                        '{{contact_phone}}': contact.phone || '',
                        '{{company_name}}': company.name || '',
                        '{{company_website}}': company.website || '',
                        '{{business_name}}': bp.business_name || '',
                        '{{business_email}}': bp.business_email || '',
                        '{{business_phone}}': bp.business_phone || '',
                        '{{business_website}}': bp.business_website || '',
                        '{{business_address}}': businessAddress,
                        '{{current_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                        '{{current_year}}': String(new Date().getFullYear()),
                        '{{unsubscribe_link}}': unsubLink,
                    };

                    let personalHtml = campaign.html_content;
                    let personalSubject = campaign.subject || '';
                    for (const [tag, val] of Object.entries(tagMap)) {
                        const re = new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g');
                        personalHtml = personalHtml.replace(re, val);
                        personalSubject = personalSubject.replace(re, val);
                    }

                    // ── Inject email tracking ──────────────────
                    const trackerBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-tracker`;

                    // 1. Tracking pixel for open detection (before </body>)
                    const pixelTag = `<img src="${trackerBase}?type=open&rid=${r.id}" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" alt="" />`;
                    if (personalHtml.includes('</body>')) {
                        personalHtml = personalHtml.replace('</body>', `${pixelTag}</body>`);
                    } else {
                        personalHtml += pixelTag;
                    }

                    // 2. Wrap links for click tracking (skip unsubscribe links)
                    personalHtml = personalHtml.replace(
                        /href="(https?:\/\/[^"]+)"/gi,
                        (_match: string, linkUrl: string) => {
                            // Don't wrap unsubscribe links
                            if (linkUrl.includes('/unsubscribe/')) return `href="${linkUrl}"`;
                            const encoded = encodeURIComponent(linkUrl);
                            return `href="${trackerBase}?type=click&rid=${r.id}&url=${encoded}"`;
                        },
                    );

                    await client.send({
                        from: fromAddress,
                        to: r.email,
                        subject: personalSubject,
                        mimeContent: htmlMime(personalHtml),
                        replyTo,
                    });

                    await supabase.from('campaign_recipients').update({ status: 'sent' }).eq('id', r.id);
                    sentCount++;
                } catch (sendErr: any) {
                    console.error(`Failed to send to ${r.email}:`, sendErr?.message || sendErr);
                    await supabase.from('campaign_recipients').update({ status: 'failed' }).eq('id', r.id);
                    failCount++;
                }

                // Batch delay
                if (batchSize && (i + 1) % batchSize === 0 && i + 1 < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, batchInterval));
                }
            }

            // 6. Update campaign status
            const finalStatus = failCount === recipients.length ? 'failed' : 'sent';
            await supabase.from('email_campaigns').update({
                status: finalStatus,
                sent_at: new Date().toISOString(),
                total_recipients: recipients.length,
                stats: { sent: sentCount, failed: failCount, total: recipients.length },
                updated_at: new Date().toISOString(),
            }).eq('id', campaignId);

            await client.close();
            return jsonRes({ ok: true, sent: sentCount, failed: failCount, total: recipients.length });
        }

        // ─── Action: send_review_request ─────────────
        if (action === 'send_review_request') {
            const { requestId } = body;
            if (!requestId) return jsonRes({ error: 'requestId is required' }, 400);

            // Fetch the review request
            const { data: request, error: reqErr } = await supabase
                .from('review_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (reqErr || !request) return jsonRes({ error: 'Review request not found' }, 400);

            // Fetch Google Settings to get the review link
            const { data: googleSettings, error: gsErr } = await supabase
                .from('google_settings')
                .select('google_review_link')
                .limit(1)
                .single();
            
            if (gsErr || !googleSettings?.google_review_link) return jsonRes({ error: 'Google Review Link not configured in Settings' }, 400);

            const reviewLink = googleSettings.google_review_link;
            const clientName = request.contact_name || 'Valued Customer';
            const clientEmail = request.contact_email;

            // HTML template
            const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">${settings.smtp_from_name || 'Isobex Lasers'}</h1></div><div style="padding:40px 30px;text-align:center;"><h2 style="margin-top:0;color:#1a1a1a;">How did we do?</h2><p style="color:#555;font-size:16px;line-height:1.6;margin-bottom:30px;">Hi ${clientName},<br><br>Thank you for choosing ${settings.smtp_from_name || 'Isobex Lasers'}. We hope you had a great experience with us. If you have a moment, we would really appreciate it if you could leave us a review on Google.</p><a href="${reviewLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:6px;font-size:16px;">Leave a Review on Google</a></div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">${settings.smtp_from_name || 'Isobex Lasers'}</p></div></div></body></html>`;

            await client.send({
                from: fromAddress,
                to: clientEmail,
                subject: `How did we do? — ${settings.smtp_from_name || 'Isobex Lasers'}`,
                mimeContent: htmlMime(emailHtml),
                replyTo,
            });

            // Mark as sent
            await supabase.from('review_requests').update({ status: 'sent' }).eq('id', requestId);

            await client.close();
            return jsonRes({ ok: true, sentTo: clientEmail });
        }

        return jsonRes({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('send-email error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

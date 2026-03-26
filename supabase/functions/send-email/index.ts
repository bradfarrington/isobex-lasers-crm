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

// ─── Gift Card Visual Builder (inline HTML for emails) ──────────────
function buildGiftCardHtml(design: string, amount: number, code: string, recipientName: string): string {
    const designs: Record<string, { bg: string; textColor: string; amountColor: string; codeColor: string; labelColor: string }> = {
        classic: {
            bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            textColor: '#ffffff',
            amountColor: '#dc2626',
            codeColor: 'rgba(255,255,255,0.7)',
            labelColor: 'rgba(255,255,255,0.35)',
        },
        industrial: {
            bg: 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 40%, #111111 100%)',
            textColor: '#e0e0e0',
            amountColor: '#ffffff',
            codeColor: '#888888',
            labelColor: 'rgba(255,255,255,0.35)',
        },
        festive: {
            bg: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 40%, #ef4444 100%)',
            textColor: '#ffffff',
            amountColor: '#fef3c7',
            codeColor: 'rgba(255,255,255,0.7)',
            labelColor: 'rgba(255,255,255,0.35)',
        },
        minimal: {
            bg: '#ffffff',
            textColor: '#1a1a1a',
            amountColor: '#dc2626',
            codeColor: '#9ca3af',
            labelColor: '#9ca3af',
        },
    };

    const d = designs[design] || designs.classic;
    const isMinimal = design === 'minimal';
    const border = isMinimal ? 'border:1px solid #e5e7eb;' : '';
    const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

    return `<table cellpadding="0" cellspacing="0" border="0" width="400" style="max-width:400px;margin:0 auto;border-radius:16px;overflow:hidden;${border}background:${d.bg};font-family:'Inter',Helvetica,Arial,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="padding:24px 24px 0 24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${d.textColor};">🎁 GIFT CARD</td>
        <td style="text-align:right;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${d.labelColor};">GIFT CARD</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 24px 4px 24px;">
    <span style="font-size:20px;font-weight:600;color:${d.amountColor};opacity:0.8;">£</span>
    <span style="font-size:40px;font-weight:800;letter-spacing:-0.02em;line-height:1;color:${d.amountColor};">${formattedAmount}</span>
  </td></tr>
  <tr><td style="padding:8px 24px 0 24px;">
    <span style="font-family:'Courier New',monospace;font-size:14px;letter-spacing:0.15em;color:${d.codeColor};">${code}</span>
  </td></tr>
  <tr><td style="padding:16px 24px 24px 24px;">
    <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${d.textColor};">${recipientName}</div>
  </td></tr>
</table>`;
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

        // ─── Order Email Actions (DB-backed MJML templates) ──────
        if (action === 'send_order_confirmation' || action === 'send_refund_confirmation') {
            const { orderId } = body;
            if (!orderId) return jsonRes({ error: 'orderId is required' }, 400);

            // Map action to system_key
            const systemKeyMap: Record<string, string> = {
                send_order_confirmation: 'order_confirmation',
                send_refund_confirmation: 'refund_confirmation',
            };
            const systemKey = systemKeyMap[action];

            // Fetch order with contact and items
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*, contact:contacts(first_name, last_name, email), items:order_items(product_name, quantity, unit_price, product_image_url)')
                .eq('id', orderId)
                .single();

            if (orderErr || !order) return jsonRes({ error: 'Order not found' }, 400);
            const clientEmail = order.contact?.email;
            if (!clientEmail) return jsonRes({ error: 'Customer has no email address' }, 400);

            const clientName = `${order.contact?.first_name || ''} ${order.contact?.last_name || ''}`.trim() || 'Customer';
            const orderNumber = order.order_number || order.id.slice(0, 8).toUpperCase();
            const subtotal = Number(order.subtotal || 0);
            const shippingCost = Number(order.shipping_cost || 0);
            const vatAmount = Number(order.tax_amount || 0);
            const totalAmount = Number(order.total || 0);
            const discountAmount = Number(order.discount_amount || 0);
            const discountCode = order.discount_code || '';
            const giftCardAmount = Number(order.gift_card_amount || 0);
            const giftCardCode = order.gift_card_code || '';

            // Build items table HTML
            const itemRows = (order.items || []).map((item: { product_name: string; quantity: number; unit_price: number; product_image_url?: string | null }) => {
                const lineTotal = Number(item.unit_price || 0) * item.quantity;
                const imageHtml = item.product_image_url 
                    ? `<img src="${item.product_image_url}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;margin-right:12px;vertical-align:middle;" />`
                    : '<div style="width:40px;height:40px;border-radius:4px;background:#f3f4f6;margin-right:12px;display:inline-block;vertical-align:middle;"></div>';
                return `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;">
                    <div style="display:table;width:100%;">
                        <div style="display:table-cell;width:52px;vertical-align:middle;">${imageHtml}</div>
                        <div style="display:table-cell;vertical-align:middle;">${item.product_name}</div>
                    </div>
                </td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">£${Number(item.unit_price || 0).toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">£${lineTotal.toFixed(2)}</td></tr>`;
            }).join('');
            const itemsTable = `<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Item</th><th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Qty</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Price</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Total</th></tr></thead><tbody>${itemRows}</tbody></table>`;

            // Build price breakdown HTML — conditionally include discount & gift card rows
            const breakdownRows: string[] = [
                `<tr><td style="padding:6px 12px;color:#555;">Subtotal</td><td style="padding:6px 12px;text-align:right;">£${subtotal.toFixed(2)}</td></tr>`,
            ];
            if (discountAmount > 0) {
                breakdownRows.push(`<tr><td style="padding:6px 12px;color:#16a34a;">Discount${discountCode ? ` (${discountCode})` : ''}</td><td style="padding:6px 12px;text-align:right;color:#16a34a;">-£${discountAmount.toFixed(2)}</td></tr>`);
            }
            if (giftCardAmount > 0) {
                breakdownRows.push(`<tr><td style="padding:6px 12px;color:#16a34a;">Gift Card${giftCardCode ? ` (${giftCardCode})` : ''}</td><td style="padding:6px 12px;text-align:right;color:#16a34a;">-£${giftCardAmount.toFixed(2)}</td></tr>`);
            }
            breakdownRows.push(
                `<tr><td style="padding:6px 12px;color:#555;">Shipping</td><td style="padding:6px 12px;text-align:right;">${shippingCost > 0 ? '£' + shippingCost.toFixed(2) : 'Free'}</td></tr>`
            );
            if (vatAmount > 0) {
                breakdownRows.push(`<tr><td style="padding:6px 12px;color:#555;">VAT (20%)</td><td style="padding:6px 12px;text-align:right;">£${vatAmount.toFixed(2)}</td></tr>`);
            }
            breakdownRows.push(
                `<tr style="border-top:2px solid #1a1a1a;"><td style="padding:10px 12px;font-weight:700;font-size:16px;">Total</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:#dc2626;">£${totalAmount.toFixed(2)}</td></tr>`,
            );
            const priceBreakdown = `<table style="width:100%;border-collapse:collapse;">${breakdownRows.join('')}</table>`;

            // Fetch business profile for {{business_name}} and VAT
            const { data: bpData } = await supabase.from('business_profile').select('business_name, vat_number').limit(1).single();
            const businessName = bpData?.business_name || settings.smtp_from_name || 'Isobex Lasers';
            const businessVatNumber = bpData?.vat_number || '';

            // Fetch the system template from DB
            const { data: template } = await supabase
                .from('email_templates')
                .select('mjml_source, subject')
                .eq('is_system', true)
                .eq('system_key', systemKey)
                .single();

            // Order merge tags to replace in the template
            const orderTags: Record<string, string> = {
                '{{customer_name}}': clientName,
                '{{order_number}}': orderNumber,
                '{{order_subtotal}}': `£${subtotal.toFixed(2)}`,
                '{{order_shipping}}': shippingCost > 0 ? `£${shippingCost.toFixed(2)}` : 'Free',
                '{{order_vat}}': `£${vatAmount.toFixed(2)}`,
                '{{order_total}}': `£${totalAmount.toFixed(2)}`,
                '{{order_items_table}}': itemsTable,
                '{{order_price_breakdown}}': priceBreakdown,
                '{{business_name}}': businessName,
                '{{business_vat_number}}': businessVatNumber,
            };

            function replaceOrderTags(html: string): string {
                let result = html;
                for (const [tag, val] of Object.entries(orderTags)) {
                    result = result.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), val);
                }
                return result;
            }

            let emailHtml: string;
            let emailSubject: string;

            if (template?.mjml_source) {
                // Use the editable MJML template from the DB
                emailHtml = replaceOrderTags(template.mjml_source);
                emailSubject = replaceOrderTags(template.subject || `Order #${orderNumber}`);
            } else {
                // Fallback: simple inline HTML if template hasn't been saved yet
                const fallbackSubjects: Record<string, string> = {
                    order_confirmation: `Order Confirmation — #${orderNumber}`,
                    refund_confirmation: `Refund Processed — Order #${orderNumber}`,
                };
                emailSubject = fallbackSubjects[systemKey] || `Order #${orderNumber}`;
                const heading = systemKey === 'order_confirmation' ? 'Order Confirmed ✓' : 'Refund Processed';
                const bodyContent = systemKey === 'refund_confirmation'
                    ? `<p>Hi ${clientName},</p><p>We've processed a refund for your order.</p>${itemsTable}${priceBreakdown}`
                    : `<p>Hi ${clientName},</p><p>Thank you for your order!</p>${itemsTable}${priceBreakdown}<p style="font-size:13px;color:#888;">Questions? Get in touch.</p>`;
                emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">${businessName}</h1></div><div style="padding:30px 20px;"><h2 style="margin-top:0;color:#dc2626;">${heading}</h2>${bodyContent}</div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">${businessName}</p></div></div></body></html>`;
            }

            await client.send({ from: fromAddress, to: clientEmail, subject: emailSubject, mimeContent: htmlMime(emailHtml), replyTo });
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
                        '{{business_vat_number}}': bp.vat_number || '',
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

        // ─── Action: send_gift_card_notification ──────────
        if (action === 'send_gift_card_notification') {
            const { giftCardId } = body;
            if (!giftCardId) return jsonRes({ error: 'giftCardId is required' }, 400);

            // Fetch the gift card record
            const { data: gc, error: gcErr } = await supabase
                .from('gift_cards')
                .select('*')
                .eq('id', giftCardId)
                .single();

            if (gcErr || !gc) return jsonRes({ error: 'Gift card not found' }, 400);
            if (!gc.recipient_email) return jsonRes({ error: 'Gift card has no recipient email' }, 400);

            const recipientName = gc.recipient_name || 'Friend';
            const senderName = body.senderName || 'Someone special';
            const giftCardCode = gc.code;
            const giftCardAmount = `£${Number(gc.initial_balance).toFixed(2)}`;
            const giftCardMessage = gc.message || '';
            const giftCardExpiry = gc.expires_at
                ? new Date(gc.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'No expiry';
            const designTemplate = gc.design_template || 'classic';

            // Build the visual card HTML (used only if {{gift_card_visual}} is still in the template)
            const giftCardVisual = buildGiftCardHtml(designTemplate, Number(gc.initial_balance), giftCardCode, recipientName);

            // Fetch business profile
            const { data: bpData } = await supabase.from('business_profile').select('business_name, vat_number').limit(1).single();
            const businessName = bpData?.business_name || settings.smtp_from_name || 'Our Store';
            const businessVatNumber = bpData?.vat_number || '';

            const messageIntro = giftCardMessage ? ` with a message` : '';

            // Merge tags - Note: gift_card_amount intentionally omits the £ symbol here to prevent double ££ symbols in legacy templates that hardcoded the £ sign
            const gcTags: Record<string, string> = {
                '{{recipient_name}}': recipientName,
                '{{sender_name}}': senderName,
                '{{gift_card_code}}': giftCardCode,
                '{{gift_card_amount}}': Number(gc.initial_balance).toFixed(2),
                '{{gift_card_message}}': giftCardMessage,
                '{{gift_card_message_intro}}': messageIntro,
                '{{gift_card_expiry}}': giftCardExpiry,
                '{{gift_card_visual}}': giftCardVisual,
                '{{business_name}}': businessName,
                '{{business_vat_number}}': businessVatNumber,
            };

            function replaceGcTags(html: string): string {
                let result = html;
                for (const [tag, val] of Object.entries(gcTags)) {
                    result = result.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), val);
                }
                
                // Inject message bubble for users who saved templates without the visual block dynamically picking it up
                if (giftCardMessage && !html.includes('{{gift_card_message}}')) {
                    const messageBubble = `<div style="max-width:400px;margin:24px auto;background:#f9fafb;border-radius:12px;padding:20px;font-style:italic;color:#555;font-size:15px;line-height:1.6;text-align:center;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);border:1px solid #f3f4f6;">"${giftCardMessage}"<div style="margin-top:12px;font-style:normal;font-weight:600;font-size:13px;color:#111827;letter-spacing:0.02em;">— ${senderName}</div></div>`;
                    result = result.replace('To redeem your gift card', messageBubble + '<br/><br/>To redeem your gift card');
                }
                return result;
            }

            // Fetch system template
            const { data: template } = await supabase
                .from('email_templates')
                .select('mjml_source, subject')
                .eq('is_system', true)
                .eq('system_key', 'gift_card_delivery')
                .single();

            let emailHtml: string;
            let emailSubject: string;

            if (template?.mjml_source) {
                emailHtml = replaceGcTags(template.mjml_source);
                emailSubject = replaceGcTags(template.subject || 'You\'ve received a Gift Card! 🎁');
            } else {
                // Fallback inline HTML
                emailSubject = 'You\'ve received a Gift Card! 🎁';
                const messageBlock = giftCardMessage
                    ? `<div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:16px 20px;font-style:italic;color:#555;font-size:14px;line-height:1.5;">"${giftCardMessage}"<div style="margin-top:8px;font-style:normal;font-size:12px;color:#888;">— ${senderName}</div></div>`
                    : '';
                emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">${businessName}</h1></div><div style="padding:30px 20px;"><h2 style="margin-top:0;color:#dc2626;text-align:center;">You've Received a Gift Card! 🎁</h2><p>Hi ${recipientName},</p><p>${senderName} has sent you a gift card${messageIntro}!</p><div style="text-align:center;padding:20px 0;">${giftCardVisual}</div>${messageBlock}<p style="text-align:center;font-size:13px;color:#888;">To redeem your gift card, enter the code at checkout.</p></div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">This gift card expires on ${giftCardExpiry}. • ${businessName}</p></div></div></body></html>`;
            }

            await client.send({ from: fromAddress, to: gc.recipient_email, subject: emailSubject, mimeContent: htmlMime(emailHtml), replyTo });
            await client.close();
            return jsonRes({ ok: true, sentTo: gc.recipient_email });
        }

        return jsonRes({ error: `Unknown action: ${action}` }, 400);

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('send-email error:', errMsg, err);
        return jsonRes({ error: errMsg || 'Internal server error' }, 500);
    }
});

// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// 1×1 transparent PNG (68 bytes)
const PIXEL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type');   // 'open' or 'click'
  const rid = url.searchParams.get('rid');      // recipient ID

  if (!rid || !type) {
    return new Response('Bad request', { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // ─── Open tracking ──────────────────────────
    if (type === 'open') {
      // Only upgrade to 'opened' if current status is sent/delivered (don't downgrade clicked)
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('id, status, opened_at')
        .eq('id', rid)
        .single();

      if (recipient && (recipient.status === 'sent' || recipient.status === 'delivered')) {
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'opened',
            opened_at: recipient.opened_at || new Date().toISOString(),
          })
          .eq('id', rid);
      }

      // Always return the tracking pixel
      return new Response(PIXEL_PNG, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    // ─── Click tracking ─────────────────────────
    if (type === 'click') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing url param', { status: 400, headers: corsHeaders });
      }

      const now = new Date().toISOString();

      // Check if this is a review request click (rrid param)
      const rrid = url.searchParams.get('rrid');
      if (rrid) {
        // Update review request status to clicked and complete the sequence
        const { data: reviewReq } = await supabase
          .from('review_requests')
          .select('id, status')
          .eq('id', rrid)
          .single();

        if (reviewReq && reviewReq.status !== 'clicked') {
          await supabase
            .from('review_requests')
            .update({
              status: 'clicked',
              sequence_completed: true,
            })
            .eq('id', rrid);
        }

        // 302 redirect to the actual destination
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': targetUrl, 'Cache-Control': 'no-store' },
        });
      }

      // Campaign recipient click tracking (existing logic)
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('id, status, opened_at')
        .eq('id', rid)
        .single();

      if (recipient && recipient.status !== 'clicked') {
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'clicked',
            opened_at: recipient.opened_at || now,
            clicked_at: now,
          })
          .eq('id', rid);
      }

      // 302 redirect to the actual destination
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': targetUrl, 'Cache-Control': 'no-store' },
      });
    }

    return new Response('Unknown type', { status: 400, headers: corsHeaders });

  } catch (err) {
    console.error('email-tracker error:', err);
    // For open: still return pixel so email renders fine
    if (type === 'open') {
      return new Response(PIXEL_PNG, {
        headers: { 'Content-Type': 'image/png', ...corsHeaders },
      });
    }
    // For click: redirect anyway if we have the URL
    const targetUrl = url.searchParams.get('url');
    if (targetUrl) {
      return new Response(null, { status: 302, headers: { Location: targetUrl, ...corsHeaders } });
    }
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});

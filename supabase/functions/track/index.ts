import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getBrowser(ua: string) {
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  return 'Unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const body = await req.json();
    const { type = 'page_view', session_id, url, path, title, referrer, user_agent } = body;

    if (!session_id || !url) {
      return new Response(JSON.stringify({ error: 'Missing session_id or url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userAgent = user_agent || req.headers.get('user-agent') || 'Unknown';
    const device_type = /Mobi|Android/i.test(userAgent) ? 'mobile' : 'desktop';
    const browser = getBrowser(userAgent);
    const country = req.headers.get('cf-ipcountry') || 'Unknown';
    const urlObj = new URL(url);

    if (type === 'page_view') {
      const { error: dbError } = await supabase.from('page_views').insert({
        session_id,
        url,
        path: urlObj.pathname,
        title,
        referrer,
        user_agent: userAgent,
        device_type,
        browser,
        country,
        active_seconds: 0
      });

      if (dbError) {
        console.error('Insert error:', dbError);
        throw dbError;
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Tracking Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// Generate or get existing session ID
function getSessionId() {
  const key = 'isbx_session';
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem(key, sid);
  }
  return sid;
}

function getBrowser(ua: string) {
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  return 'Unknown';
}

function getCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Europe/London')) return 'United Kingdom';
    if (tz.includes('America/')) return 'United States';
    return tz.split('/')[1]?.replace('_', ' ') || 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

export function useTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track page view
    const sid = getSessionId();
    const track = async () => {
      try {
        await supabase.from('page_views').insert({
          session_id: sid,
          url: window.location.href,
          path: location.pathname,
          title: document.title,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser: getBrowser(navigator.userAgent),
          country: getCountry(),
          active_seconds: 0
        });
      } catch (err) {
        console.error('Tracking error:', err);
      }
    };
    track();
  }, [location.pathname, location.search]);
}

export const trackEcommerceEvent = async (
  eventType: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  data: {
    product_id?: string;
    variant_id?: string;
    order_id?: string;
    value?: number;
    currency?: string;
  }
) => {
  try {
    const sid = getSessionId();
    await supabase.from('ecommerce_events').insert({
      session_id: sid,
      event_type: eventType,
      product_id: data.product_id || null,
      variant_id: data.variant_id || null,
      order_id: data.order_id || null,
      value: data.value || null,
      currency: data.currency || 'GBP'
    });
  } catch (err) {
    console.error('Failed to track ecommerce event:', err);
  }
};

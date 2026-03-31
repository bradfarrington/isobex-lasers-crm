import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TRACK_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;

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

export function useTracking() {
  const location = useLocation();

  useEffect(() => {
    const sid = getSessionId();
    const track = async () => {
      try {
        await fetch(TRACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'page_view',
            session_id: sid,
            url: window.location.href,
            path: location.pathname,
            title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
          })
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
    // Ecommerce events still go direct — they don't need IP filtering
    // (they're user-initiated actions, not passive page views)
    const { supabase } = await import('@/lib/supabase');
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

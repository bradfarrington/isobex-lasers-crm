import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target 491 total page views over 90 days
// The spikes specified:
// Jan 04: ~110, Feb 01: ~160, Feb 15: ~60, Mar 22: ~20
// The remaining ~140 views are distributed randomly.
// We use 'session_id' to mock unique visitors.
const TOTAL_VIEWS = 491;
const DAYS_BACK = 90;

function randomDateInLast(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * days));
  // Randomize hour/minute
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

function specificSpikeDate(baseDateStr: string, varianceDays = 2): Date {
  const d = new Date(baseDateStr);
  const offset = (Math.random() * varianceDays * 2) - varianceDays;
  d.setDate(d.getDate() + offset);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

const BROWSERS = ['Chrome', 'Chrome', 'Chrome', 'Safari', 'Safari iOS', 'Edge', 'Firefox', 'Unknown'];
const COUNTRIES = ['United Kingdom', 'United Kingdom', 'United Kingdom', 'United States', 'Pakistan', 'Canada'];
const DEVICES = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet'];
const PAGES = ['/', '/', '/', '/products', '/about', '/collections/industrial'];
const UA_MOCKS = {
  'Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  'Safari iOS': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
  'Edge': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Unknown': 'curl/7.81.0'
};

async function seed() {
  console.log("Emptying old page_views... (optional)");
  // We won't empty here so we don't accidentally wipe real data, we just append.

  const views: any[] = [];
  
  // Create ~110 views around Jan 04 (assuming year is current)
  // To avoid hardcoding year incorrectly if we are in 2026, let's use relative days.
  // 90 days ago is approx Dec 26.
  // Jan 04 is ~81 days ago.
  // Feb 01 is ~53 days ago.
  // Feb 15 is ~39 days ago.
  // Mar 22 is ~4 days ago.

  const now = new Date();
  
  function daysAgo(targetMonth: number, targetDay: number) {
    const d = new Date(now.getFullYear(), targetMonth, targetDay);
    if (d > now) d.setFullYear(now.getFullYear() - 1);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  const jan04 = daysAgo(0, 4);
  const feb01 = daysAgo(1, 1);
  const feb15 = daysAgo(1, 15);
  const mar22 = daysAgo(2, 22);

  const viewCountDist = [
    { daysAgo: jan04, count: 110 },
    { daysAgo: feb01, count: 160 },
    { daysAgo: feb15, count: 60 },
    { daysAgo: mar22, count: 20 },
    { daysAgo: -1, count: 141 } // Randomly distributed leftovers
  ];

  for (const group of viewCountDist) {
    for (let i = 0; i < group.count; i++) {
        
      let createdDate = new Date();
      if (group.daysAgo === -1) {
        createdDate = randomDateInLast(DAYS_BACK);
      } else {
        const d = new Date();
        d.setDate(d.getDate() - group.daysAgo);
        const offsetHrs = (Math.random() * 48) - 24; // +/- 1 day variance
        d.setHours(d.getHours() + offsetHrs);
        createdDate = d;
      }

      // Simulate 20% being unique vs repeat
      const isUnique = Math.random() < 0.2;
      const sessionId = isUnique 
        ? crypto.randomUUID() 
        : `repeat-session-${Math.floor(Math.random() * 10)}`;
        
      const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
      
      views.push({
        session_id: sessionId,
        url: 'https://store.isobex.com' + PAGES[Math.floor(Math.random() * PAGES.length)],
        path: PAGES[Math.floor(Math.random() * PAGES.length)],
        title: 'Isobex Store',
        referrer: Math.random() > 0.5 ? 'https://google.com' : null,
        user_agent: UA_MOCKS[browser as keyof typeof UA_MOCKS],
        device_type: DEVICES[Math.floor(Math.random() * DEVICES.length)],
        browser: browser,
        country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        active_seconds: Math.floor(Math.random() * 300), // Random active time up to 5min
        created_at: createdDate.toISOString()
      });
    }
  }

  console.log(`Generated ${views.length} views. Inserting in batches...`);

  // Batch insert
  const batchSize = 100;
  for (let i = 0; i < views.length; i += batchSize) {
    const batch = views.slice(i, i + batchSize);
    const { error } = await supabase.from('page_views').insert(batch);
    if (error) {
      console.error("Batch insert error:", error);
    } else {
      console.log(`Inserted batch ${(i / batchSize) + 1}`);
    }
  }

  // Get active orders to mock ecommerce_events so the revenue matches actual orders natively
  const { data: orders } = await supabase.from('orders').select('id, total, created_at');
  if (orders && orders.length > 0) {
    const events = orders.map(o => ({
      session_id: crypto.randomUUID(), // Mock checkout session
      event_type: 'purchase',
      value: o.total,
      order_id: o.id,
      created_at: o.created_at
    }));
    await supabase.from('ecommerce_events').insert(events);
    console.log(`Inserted ${events.length} purchase events matching real orders.`);
  }

  console.log("Seeding complete!");
}

seed();

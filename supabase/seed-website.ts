import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

const DAYS_BACK = 90;
const TOTAL_VIEWS = 440; // From new screenshot

function randomDateInLast(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * days));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

const BROWSERS = [
  ...Array(324).fill('Chrome'),
  ...Array(64).fill('Edge'),
  ...Array(48).fill('Safari'),
  ...Array(2).fill('Firefox'),
  ...Array(2).fill('Other')
];

const COUNTRIES = [
  ...Array(261).fill('United Kingdom'),
  ...Array(147).fill('United States'),
  ...Array(12).fill('Ireland'),
  ...Array(8).fill('China'),
  ...Array(3).fill('Hong Kong'),
  ...Array(3).fill('Netherlands'),
  ...Array(2).fill('Canada')
];

const DEVICES = [
  ...Array(90).fill('desktop'),
  ...Array(10).fill('mobile')
];

const PAGES = [
  ...Array(61).fill('/'),
  ...Array(18).fill('/laser-heads'),
  ...Array(7).fill('/finance'),
  ...Array(6).fill('/our-machines'),
  ...Array(2).fill('/sheet-metal-laser-cutting'),
  ...Array(2).fill('/bt240s'),
  ...Array(2).fill('/about'),
  ...Array(2).fill('/tube-metal-laser-cutting')
];

const UA_MOCKS = {
  'Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Edge': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Other': 'curl/7.81.0'
};

async function seedWebsite() {
  const views: any[] = [];
  const now = new Date();
  
  function daysAgo(targetMonth: number, targetDay: number) {
    const d = new Date(now.getFullYear(), targetMonth, targetDay);
    if (d > now) d.setFullYear(now.getFullYear() - 1);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Peaks from new chart: 
  // late Feb (~Feb 25) spike of ~80
  // huge spike Mar 10 (~150)
  const feb25 = daysAgo(1, 25);
  const mar10 = daysAgo(2, 10);
  
  const viewCountDist = [
    { daysAgo: feb25, count: 80 },
    { daysAgo: mar10, count: 150 },
    { daysAgo: -1, count: 210 } // random
  ];

  for (const group of viewCountDist) {
    for (let i = 0; i < group.count; i++) {
        
      let createdDate = new Date();
      if (group.daysAgo === -1) {
        createdDate = randomDateInLast(100); // Dec 12 to Mar 26 is ~104 days
      } else {
        const d = new Date();
        d.setDate(d.getDate() - group.daysAgo);
        const offsetHrs = (Math.random() * 96) - 48; // +/- 2 days variance
        d.setHours(d.getHours() + offsetHrs);
        createdDate = d;
      }

      // Unique vs repeat (142 unique out of 440) -> ~32% unique
      const isUnique = Math.random() < 0.32;
      const sessionId = isUnique 
        ? crypto.randomUUID() 
        : `repeat-session-web-${Math.floor(Math.random() * 50)}`;
        
      const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
      
      views.push({
        session_id: sessionId,
        url: 'https://isobex.com' + PAGES[Math.floor(Math.random() * PAGES.length)],
        path: PAGES[Math.floor(Math.random() * PAGES.length)],
        title: 'Isobex Website',
        user_agent: UA_MOCKS[browser as keyof typeof UA_MOCKS] || UA_MOCKS['Other'],
        device_type: DEVICES[Math.floor(Math.random() * DEVICES.length)],
        browser: browser,
        country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        active_seconds: Math.floor(Math.random() * 350), 
        created_at: createdDate.toISOString()
      });
    }
  }

  // Insert website page views
  const batchSize = 100;
  for (let i = 0; i < views.length; i += batchSize) {
    const batch = views.slice(i, i + batchSize);
    await supabase.from('page_views').insert(batch);
  }
  
  // Insert 49 mock Form Views into ecommerce_events
  const events: any[] = [];
  for(let i = 0; i < 49; i++) {
    events.push({
      session_id: crypto.randomUUID(),
      event_type: 'form_view',
      value: 0,
      created_at: randomDateInLast(80).toISOString()
    });
  }
  await supabase.from('ecommerce_events').insert(events);

  console.log("Website Seeding completed!");
}

seedWebsite();

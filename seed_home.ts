import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Try loading .env manually
const envFile = readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
});

const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY']; // Note: if RLS blocks anon, won't work without service role, but usually api accepts updates or user is logged in.

const supabase = createClient(url, key);

async function run() {
  console.log('Seeding store config...');
  
  // 1. Get first config to update
  const { data: configs } = await supabase.from('store_config').select('*').limit(1);
  if (configs && configs.length > 0) {
    const configId = configs[0].id;
    const { error: cfgErr } = await supabase.from('store_config').update({
      store_name: 'Isobex Lasers',
      color_primary: '#E53E3E',
      color_secondary: '#2D3748',
      color_background: '#111111',
      color_surface: '#1A202C',
      color_text: '#FFFFFF',
      color_text_secondary: '#A0AEC0',
      font_heading: 'Inter',
      font_body: 'Inter',
      announcement_bar_active: true,
      announcement_bar_text: '📢 FREE SHIPPING ON UK ORDERS OVER £100'
    }).eq('id', configId);
    
    if (cfgErr) console.error('Config err:', cfgErr);
  }

  console.log('Seeding home page...');
  const blocks = [
    {
      "id": "blk_hero",
      "type": "hero",
      "config": {
        "title": "High-Performance Laser Machine Parts",
        "subtitle": "Engineered for Accuracy, Built for Endurance. Trusted by industry leaders across the UK.",
        "bgImage": "https://storage.googleapis.com/msgsndr/XEKLcEf1Xlnf72ABaYI6/media/68df86475a4d7f82e3c1bd4a.jpeg",
        "alignment": "center",
        "overlayOpacity": 60,
        "height": "600px",
        "buttonText": "Shop Parts",
        "buttonLink": "/shop/products"
      }
    },
    {
      "id": "blk_ticker",
      "type": "ticker",
      "config": {
        "text": "⚡ GENUINE PARTS ⚡ NEXT DAY DELIVERY ⚡ EXPERT SUPPORT ⚡",
        "speed": 20,
        "bgColor": "#E53E3E",
        "textColor": "#FFFFFF"
      }
    },
    {
      "id": "blk_features",
      "type": "features",
      "config": {
        "items": [
          { "icon": "checkCircle", "title": "Genuine Quality", "description": "Maintain your system’s cutting quality with genuine parts designed to keep you running efficiently." },
          { "icon": "truck", "title": "Fast Delivery", "description": "Next day UK delivery available on all stock items to minimize your downtime." },
          { "icon": "shield", "title": "Built for Endurance", "description": "Each part is designed to withstand the rigors of high-performance daily operation." }
        ]
      }
    },
    {
      "id": "blk_collections",
      "type": "collection_showcase",
      "config": {
        "title": "CHOOSE YOUR CUTTING COMPONENTS",
        "subtitle": "Browse our most popular replacement part collections."
      }
    },
    {
      "id": "blk_banner",
      "type": "banner",
      "config": {
        "text": "Maintain your system’s cutting quality with genuine parts.",
        "bgColor": "#1A202C",
        "textColor": "#FFFFFF",
        "align": "center"
      }
    }
  ];

  const { data: pages } = await supabase.from('store_pages').select('*').eq('page_key', 'home');
  
  if (pages && pages.length > 0) {
    const { error: pageErr } = await supabase.from('store_pages').update({
      title: 'Home',
      is_published: true,
      blocks
    }).eq('page_key', 'home');
    if (pageErr) console.error('Page err:', pageErr);
  } else {
    const { error: pageErr } = await supabase.from('store_pages').insert({
      page_key: 'home',
      title: 'Home',
      is_published: true,
      blocks
    });
    if (pageErr) console.error('Page insert err:', pageErr);
  }

  console.log('Done seeding!');
}

run();

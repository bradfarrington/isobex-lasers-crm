import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Emulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.loadEnvFile(path.resolve(__dirname, '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function injectHalfdaysHomepage() {
  const blocks = [
    {
      id: 'block_halfhero_1',
      type: 'half_hero',
      config: {
        title: '',
        subtitle: '',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&fit=crop&q=80',
        ctaText: '',
        ctaLink: '',
        height: '75vh',
        objectPosition: 'center 20%'
      }
    },
    {
      id: 'block_spacer_1',
      type: 'spacer',
      config: { height: 20 }
    },
    {
      id: 'block_showcase_1',
      type: 'collection_showcase',
      config: {
        title: 'INTRODUCING THE SPRING 2026 COLLECTION',
        subtitle: 'Built for a life in constant motion.',
        collectionId: '',
        limit: 5,
        showSwatches: true,
        ctaText: 'SHOP NOW',
        ctaLink: '/shop/products'
      }
    },
    {
      id: 'block_catlinks_1',
      type: 'category_links',
      config: {
        items: [
          {
            title: 'MACHINES',
            imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&fit=crop',
            link: '/shop/products'
          },
          {
            title: 'PARTS',
            imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&fit=crop',
            link: '/shop/products'
          },
          {
            title: 'ACCESSORIES',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&fit=crop',
            link: '/shop/products'
          }
        ]
      }
    },
    {
      id: 'block_carousel_1',
      type: 'product_carousel',
      config: {
        title: 'BEST SELLERS',
        ctaText: 'SHOP NOW',
        ctaLink: '/shop/products',
        collectionId: '',
        limit: 8
      }
    },
    {
      id: 'block_banner_1',
      type: 'banner',
      config: {
        text: 'FREE SHIPPING ON ALL ORDERS OVER £50',
        bgColor: '#111827',
        textColor: '#ffffff',
        align: 'center'
      }
    }
  ];

  const { error } = await supabase
    .from('store_pages')
    .update({ blocks, updated_at: new Date().toISOString() })
    .eq('page_key', 'home');

  if (error) {
    console.error("Failed to update homepage:", error);
  } else {
    console.log("Successfully injected Halfdays homepage layout!");
  }
}

injectHalfdaysHomepage();

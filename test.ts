import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function run() {
  const { data: pageViews, error } = await supabase.from('page_views').select('*');
  console.log("Total Views Count:", pageViews?.length);
  if (pageViews && pageViews.length > 0) {
    console.log("First view timestamp:", pageViews[0].created_at);
  }
  if (error) {
    console.error("Supabase Error:", error);
  }
}

run();

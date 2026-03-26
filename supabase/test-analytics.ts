import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
const { resolve } = require('path');

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !url.startsWith("http")) {
  console.log("ERROR: VITE_SUPABASE_URL undefined");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('page_views').select('*').limit(5);
  console.log("Views fetched:", data?.length);
  if (data && data.length > 0) {
    console.log("First row:", data[0].created_at);
  } else {
    console.log("Error:", error);
  }
}
run();

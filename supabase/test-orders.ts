import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total')
    .or('is_test.is.null,is_test.eq.false')
    .limit(5);

  console.log("Data length:", data?.length);
  if (error) {
    console.error("Supabase Error:", error);
  } else if (!data || data.length === 0) {
    const { data: raw, error: err2 } = await supabase.from('orders').select('*').limit(5);
    console.log("Raw without filters:", raw?.length, err2);
  }
}

run();

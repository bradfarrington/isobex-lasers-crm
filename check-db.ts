import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supa = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const { data, error } = await supa.from('contacts').select('*').limit(1).single();
  if (error) {
    console.error("Fetch Error:", error);
  } else {
    console.log("COLUMNS IN DB:", Object.keys(data).join(', '));
  }
}

check();

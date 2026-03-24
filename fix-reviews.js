import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const { data, error } = await supabase.from('product_reviews').select('*');
  console.log("Reviews:", data);

  // If we can't delete using anon/authenticated, we need to fix it via admin.
}

fix();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function run() {
  // 1. Raw orders from the table
  const { data: allOrders, error: e1 } = await supabase
    .from('orders')
    .select('id, order_number, created_at, total, status, notes, is_test')
    .order('order_number', { ascending: true });

  console.log("=== ALL ORDERS FROM TABLE ===");
  console.log("Count:", allOrders?.length);
  if (e1) console.error("Error:", e1);
  let grandTotal = 0;
  allOrders?.forEach(o => {
    grandTotal += Number(o.total || 0);
    console.log(`  #${o.order_number} | £${Number(o.total).toFixed(2)} | status: ${o.status} | is_test: ${o.is_test} | date: ${o.created_at} | notes: ${(o.notes || '').substring(0, 30)}`);
  });
  console.log("GRAND TOTAL:", `£${grandTotal.toFixed(2)}`);

  // 2. What the RPC returns
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const { data: rpcOrders, error: e2 } = await supabase.rpc('get_analytics_orders', { start_dt: cutoff.toISOString() });
  console.log("\n=== RPC RESULTS ===");
  console.log("RPC Count:", rpcOrders?.length);
  if (e2) console.error("RPC Error:", e2);

  // 3. After frontend filter (is_test !== true, 90 days)
  const now = new Date();
  const start90 = new Date(now);
  start90.setDate(start90.getDate() - 90);
  start90.setHours(0,0,0,0);
  
  const filtered = (rpcOrders || []).filter((o: any) => new Date(o.created_at) >= start90 && o.is_test !== true);
  console.log("\n=== AFTER FRONTEND 90-DAY + NON-TEST FILTER ===");
  console.log("Filtered count:", filtered.length);
  let filteredTotal = 0;
  filtered.forEach((o: any) => {
    filteredTotal += Number(o.total || 0);
  });
  console.log("FILTERED TOTAL:", `£${filteredTotal.toFixed(2)}`);
}

run();

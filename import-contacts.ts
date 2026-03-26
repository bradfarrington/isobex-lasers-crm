import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importContacts() {
  const filePath = 'Export_Contacts_All_Mar_2026_6_47_PM.csv';
  const csvData = fs.readFileSync(filePath, 'utf-8');

  // Basic CSV parsing
  const rows = csvData.split('\n').filter(Boolean);
  const headers = rows[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());

  let skippedCount = 0;
  let importedCount = 0;
  let errorsCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    // A simple regex to split CSV properly handling quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    let match;
    const values: string[] = [];
    
    // Better CSV parser split
    let currentVal = '';
    let inQuotes = false;
    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal);

    const contactId = values[0]?.replace(/^"|"$/g, '') || '';
    const firstName = values[1]?.replace(/^"|"$/g, '') || '';
    const lastName = values[2]?.replace(/^"|"$/g, '') || '';
    const phone = values[3]?.replace(/^"|"$/g, '') || null;
    let email = values[4]?.replace(/^"|"$/g, '') || null;
    const businessName = values[5]?.replace(/^"|"$/g, '') || null;
    const createdAt = values[6]?.replace(/^"|"$/g, '') || new Date().toISOString();
    const tags = ((values[8] || '').replace(/^"|"$/g, '')).toLowerCase();

    // if all are empty
    if (!firstName && !lastName && !phone && !email && !businessName) continue;
    if (email) email = email.toLowerCase().trim();

    // 1. Check if contact exists by Email or Phone
    let existingContact = null;
    
    if (email) {
      const { data, error } = await supabase.from('contacts').select('id').eq('email', email).maybeSingle();
      if (data) existingContact = data;
    }
    if (!existingContact && phone) {
      const { data, error } = await supabase.from('contacts').select('id').eq('phone', phone).maybeSingle();
      if (data) existingContact = data;
    }

    if (existingContact) {
      skippedCount++;
      continue;
    }

    // 2. Check if company exists if it has business name
    let companyId = null;
    if (businessName) {
      const { data: extCompany } = await supabase.from('companies').select('id').eq('name', businessName).maybeSingle();
      if (extCompany) {
        companyId = extCompany.id;
      } else {
        const { data: newCompany, error: companyErr } = await supabase.from('companies').insert({
          name: businessName,
          status: 'Active' // Guessing a default status
        }).select().single();
        if (newCompany) {
          companyId = newCompany.id;
        } else {
          console.error("Company creation error for", businessName, companyErr);
        }
      }
    }

    const isCustomer = tags.includes('customer');
    const unsubscribed = tags.includes('unsubscribed') || tags.includes('bounced');

    const contactType = isCustomer ? 'Customer' : 'Lead';

    const insertPayload = {
      first_name: firstName || (businessName ? businessName : 'Unknown'),
      last_name: lastName || (businessName ? '' : 'Contact'),
      email,
      phone,
      company_id: companyId,
      contact_type: contactType,
      unsubscribed,
      created_at: new Date(createdAt).toISOString()
    };

    const { error: insertErr } = await supabase.from('contacts').insert(insertPayload);

    if (insertErr) {
      console.error(`Failed to insert contact for ${email || phone}:`, insertErr);
      errorsCount++;
    } else {
      importedCount++;
    }
  }

  console.log('--- Import Summary ---');
  console.log(`Total rows processed: ${skippedCount + importedCount + errorsCount}`);
  console.log(`Skipped existing: ${skippedCount}`);
  console.log(`Imported new: ${importedCount}`);
  console.log(`Errors: ${errorsCount}`);
}

importContacts().catch(console.error);


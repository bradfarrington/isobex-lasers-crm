/**
 * Import tags from HighLevel CSV export into Supabase.
 * 
 * Reads the CSV, extracts unique tag names, creates them in the `tags` table,
 * then matches contacts by email and inserts `contact_tags` rows.
 *
 * Usage: node scripts/import-tags-from-csv.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env for Supabase creds
const envPath = resolve(__dirname, '..', '.env');
const envFile = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Parse CSV ───────────────────────────────────────────
const csvPath = resolve(__dirname, '..', 'Export_Contacts_All_Mar_2026_6_47_PM.csv');
const raw = readFileSync(csvPath, 'utf-8');

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

const lines = raw.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);
const emailIdx = headers.indexOf('Email');
const tagsIdx = headers.indexOf('Tags');

if (emailIdx === -1 || tagsIdx === -1) {
  console.error('❌ Could not find Email or Tags column in CSV headers:', headers);
  process.exit(1);
}

// Build email → tags[] map
const emailTagsMap = new Map(); // email → Set<tagName>
const allTagNames = new Set();

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  const email = (fields[emailIdx] || '').trim().toLowerCase();
  const tagsRaw = (fields[tagsIdx] || '').trim();

  if (!email || !tagsRaw) continue;

  const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  if (tags.length === 0) continue;

  for (const t of tags) allTagNames.add(t);

  if (!emailTagsMap.has(email)) emailTagsMap.set(email, new Set());
  for (const t of tags) emailTagsMap.get(email).add(t);
}

console.log(`📊 Found ${allTagNames.size} unique tags: ${[...allTagNames].join(', ')}`);
console.log(`📊 Found ${emailTagsMap.size} contacts with tags to import\n`);

// ── Import ──────────────────────────────────────────────
async function run() {
  // 1. Create all tags (upsert by name)
  const tagNameToId = new Map();

  for (const name of allTagNames) {
    // Try to find existing first
    const { data: existing } = await supabase
      .from('tags')
      .select('id, name')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      tagNameToId.set(name, existing.id);
      console.log(`  ✓ Tag "${name}" already exists (${existing.id})`);
    } else {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name })
        .select()
        .single();

      if (error) {
        console.error(`  ✗ Failed to create tag "${name}":`, error.message);
        continue;
      }
      tagNameToId.set(name, data.id);
      console.log(`  + Created tag "${name}" (${data.id})`);
    }
  }

  console.log(`\n✅ ${tagNameToId.size} tags ready\n`);

  // 2. Fetch all contacts and build email → id map
  const { data: contacts, error: cErr } = await supabase
    .from('contacts')
    .select('id, email');

  if (cErr) {
    console.error('❌ Failed to fetch contacts:', cErr.message);
    process.exit(1);
  }

  const emailToContactId = new Map();
  for (const c of contacts) {
    if (c.email) emailToContactId.set(c.email.toLowerCase(), c.id);
  }

  console.log(`📇 ${emailToContactId.size} contacts with emails in database\n`);

  // 3. Assign tags to contacts
  let matched = 0;
  let skipped = 0;
  let assigned = 0;

  const rows = [];

  for (const [email, tagNames] of emailTagsMap) {
    const contactId = emailToContactId.get(email);
    if (!contactId) {
      skipped++;
      continue;
    }

    matched++;
    for (const tagName of tagNames) {
      const tagId = tagNameToId.get(tagName);
      if (!tagId) continue;
      rows.push({ contact_id: contactId, tag_id: tagId });
    }
  }

  console.log(`🔗 ${matched} contacts matched by email, ${skipped} not found in DB`);

  if (rows.length > 0) {
    // Batch upsert in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('contact_tags')
        .upsert(chunk, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });

      if (error) {
        console.error(`  ✗ Failed to insert chunk ${i / CHUNK + 1}:`, error.message);
      } else {
        assigned += chunk.length;
        console.log(`  ✓ Inserted chunk ${i / CHUNK + 1} (${chunk.length} rows)`);
      }
    }
  }

  console.log(`\n🎉 Done! ${assigned} tag assignments created for ${matched} contacts.`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

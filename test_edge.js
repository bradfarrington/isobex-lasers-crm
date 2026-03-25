const fetch = require('node:fetch');
require('dotenv').config({ path: '/Users/bradfarrington/Downloads/isobex-lasers-crm/.env' });

async function test() {
  const url = process.env.VITE_SUPABASE_URL + '/functions/v1/send-email';
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  console.log("Sending to:", url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        action: 'test_builder',
        toEmail: 'test@example.com',
        subject: 'Local Test',
        html: '<h1>Test</h1>'
      })
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
test();

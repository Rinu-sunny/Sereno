import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ehdwihmbalkflpvqtvcy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHdpaG1iYWxrZmxwdnF0dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUzNDksImV4cCI6MjA3NTE4MTM0OX0.9JrudkcoU17vU3Do2JwWsn6xPvJVq9XlfEn_88TIV7Y';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;

  if (!email || !password) {
    console.error('Please provide SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD environment variables to run this script.\nExample (PowerShell): $env:SUPABASE_TEST_EMAIL="you@example.com"; $env:SUPABASE_TEST_PASSWORD="YourPass123"; node scripts/e2e-smoke.mjs');
    process.exit(1);
  }

  // Sign in (expecting an existing test account)
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign in error:', signInError.message || signInError);
    process.exit(1);
  }
  const token = signInData?.session?.access_token;
  console.log('Got access token length', token?.length ?? 0);

  if (!token) {
    console.error('No token, aborting');
    process.exit(1);
  }

  // Call backend GET
  const backendBase = 'http://localhost:5000';
  try {
    console.log('Calling GET /api/UserSettings');
    const getRes = await fetch(`${backendBase}/api/UserSettings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('GET status', getRes.status);
    const getBody = await getRes.text();
    console.log('GET body length', getBody.length);

    console.log('Calling PUT /api/UserSettings');
    const payload = {
      workDuration: 30,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      pomodorosBeforeLongBreak: 4,
      theme: 'light',
      alarmSound: 'chime',
      notificationsEnabled: true
    };
    const putRes = await fetch(`${backendBase}/api/UserSettings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    console.log('PUT status', putRes.status);
    const putBody = await putRes.text();
    console.log('PUT body length', putBody.length);
  } catch (err) {
    console.error('Network error calling backend:', err.message || err);
  }
}

run().catch((e) => {
  console.error('Script error', e);
  process.exit(1);
});

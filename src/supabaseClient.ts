// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// --- Your Details ---
const supabaseUrl = 'https://ehdwihmbalkflpvqtvcy.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHdpaG1iYWxrZmxwdnF0dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUzNDksImV4cCI6MjA3NTE4MTM0OX0.9JrudkcoU17vU3Do2JwWsn6xPvJVq9XlfEn_88TIV7Y' // Your key is here
// --------------------

// This creates the client object that lets you talk to Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase client initialized!') // Check for this message
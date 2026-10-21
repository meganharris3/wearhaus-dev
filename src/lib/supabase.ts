import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pdjqasshilipyujnsrkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkanFhc3NoaWxpcHl1am5zcmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTM2NDcsImV4cCI6MjA5NzM4OTY0N30.vJvBMns7iCrPDHM6YloZD1t4r1rgEZ5xZEV_uxeEd6I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Confirmation/magic-link/OAuth redirects land back on the app with the session in the URL
    // (e.g. #access_token=...&type=signup on web). With this off, that token was silently
    // ignored — Supabase's own redirect worked, but the app never read what it was handed, so
    // the page just sat there looking stuck. supabase-js only acts on this in an actual browser
    // (gated internally by its own isBrowser() check), so leaving it on is a no-op on native.
    detectSessionInUrl: true,
  },
});

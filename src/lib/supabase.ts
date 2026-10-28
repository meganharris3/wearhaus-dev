import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Must stay static `process.env.EXPO_PUBLIC_*` member accesses — that is the only form Expo's
// babel plugin inlines. .env.local / .env.development / .env.production select which project.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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

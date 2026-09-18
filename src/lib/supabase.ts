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
    detectSessionInUrl: false,
  },
});

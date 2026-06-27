import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jlqelkrfeksixxfkulwf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tG7DDMyStV7t-zrEbRKtrA_hFnPJQIb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

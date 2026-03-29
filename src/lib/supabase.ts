import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present
export const supabase = (function() {
  try {
    if (supabaseUrl && supabaseAnonKey) {
      return createClient(supabaseUrl, supabaseAnonKey);
    }
  } catch (err) {
    console.error('Falha ao inicializar o Supabase:', err);
  }
  return null;
})();

if (!supabase) {
  console.warn('Supabase URL ou Anon Key ausentes. O modo offline será ativado (LocalStorage).');
}


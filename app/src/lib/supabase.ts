import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase para a app móvel.
 * Usa SEMPRE a chave ANON (pública). A service_role nunca entra no cliente.
 * Valores vêm de variáveis EXPO_PUBLIC_* (ver app/.env.example).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha cedo e com clareza durante o desenvolvimento.
  console.warn(
    '[Tesed] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY em falta. ' +
      'Copia app/.env.example para app/.env e preenche.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Em web, deixamos o supabase-js processar os tokens que vêm no URL
    // (confirmação de email / recuperação de password abrem no browser).
    // Em mobile é false: o deep link tesed:// é tratado à mão no AuthContext.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

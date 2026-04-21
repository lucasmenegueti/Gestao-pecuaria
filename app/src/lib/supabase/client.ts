import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isOnline } from '@/lib/netStatus';

// EXPO_PUBLIC_* vira acessível em runtime. Definir em app/.env (não commitado)
// ou via `eas secret` para builds de produção.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Em dev avisamos no console; em prod o app vai cair logo adiante — isso é proposital.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou _ANON_KEY não definido. Copie app/.env.example para app/.env.',
  );
}

// ---------------------------------------------------------------------
// Offline-safe fetch
// ---------------------------------------------------------------------
// O auth-js chama `console.error(e)` em `lib/fetch.js` sempre que fetch() rejeita.
// Em dev, isso vira red box do LogBox a cada transição online→offline ou chamada
// feita em modo avião. A gente intercepta fetch aqui: quando NetInfo diz offline,
// devolve uma Response sintética — o código-cliente vê um erro normal (sem red box)
// e nossa try/catch lida com ele como qualquer outra falha.

function offlineResponse(error: string, message: string): Response {
  return new Response(
    JSON.stringify({ error, message }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  );
}

function isLogoutUrl(url: string): boolean {
  // Usa endsWith para evitar match em path parecido tipo /logout-anything.
  // Query string (?scope=local) é separada com '?' — strip antes de comparar.
  const path = url.split('?')[0];
  return path.endsWith('/auth/v1/logout');
}

function offlineShortCircuit(url: string): Response | null {
  if (isOnline()) return null;
  // Para /logout: 204 faz o auth-js executar o cleanup local (remove sessão
  // do AsyncStorage). Sem isso, a sessão "renasce" no próximo boot.
  if (isLogoutUrl(url)) return new Response(null, { status: 204 });
  return offlineResponse('offline', 'Sem conexão');
}

const offlineSafeFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  const short = offlineShortCircuit(url);
  if (short) return short;
  // Timeout — Wi-Fi conectado mas sem internet trava fetch ~30s (TCP connect).
  // 30s é razoável pra 3G/rede de sítio carregando tabelas grandes (herd, rondas).
  // 10s era apertado demais quando peão tá em área com sinal fraco.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    // Rede caiu ou timeout. Mapeamos pra 503 pra não vazar TypeError pro auth-js.
    return offlineResponse('network', (e as Error)?.message ?? 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
};

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    // AsyncStorage persiste sessão no dispositivo; no web usa localStorage por padrão.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    // autoRefreshToken=false: o refresh automático do supabase-js dispara Network
    // errors visíveis em dev quando offline. O daemon de sync cuida do refresh
    // chamando startAutoRefresh/stopAutoRefresh conforme NetInfo.
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: { 'x-app': 'gestao-pecuaria-nsa' },
    fetch: offlineSafeFetch,
  },
});

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

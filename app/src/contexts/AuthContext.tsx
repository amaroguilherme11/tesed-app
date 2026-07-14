import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { getLang } from '@/i18n';
import { registerForPush, unregisterForPush } from '@/lib/notifications';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True quando o utilizador chegou via link de recuperação de password. */
  recoveringPassword: boolean;
  /** Define a nova password (durante a recuperação) e termina o modo recovery. */
  completePasswordReset: (newPassword: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Registo de PACIENTE. Exige consentimento RGPD explícito (secção 10).
   * Nunca registamos médicos por aqui (regra nº 4): o médico é convidado.
   */
  signUpPatient: (params: {
    email: string;
    password: string;
    fullName: string;
    consent: boolean;
    /** ISO YYYY-MM-DD (opcional). */
    dateOfBirth?: string | null;
    /** Telemóvel canónico "+351 912345678". */
    phone?: string | null;
  }) => Promise<{ needsConfirmation: boolean }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Promise que rejeita ao fim de `ms` — evita ficar pendurado num pedido que não responde. */
function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Carrega o perfil (uma tentativa, com timeout para não pendurar). A REPETIÇÃO
 * fica a cargo de quem chama (efeito de auto-recuperação + AppState), para o
 * arranque a frio recuperar sozinho sem ficar preso no spinner.
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('profiles').select('*').eq('id', userId).single(),
      6000,
    );
    if (!error && data) return data as Profile;
  } catch {
    // timeout ou erro de rede — o chamador volta a tentar
  }
  return null;
}

// --- Cache local do perfil (por utilizador) ---------------------------------
// Permite ROUTING INSTANTÂNEO no arranque a frio: mostramos já a app com o
// perfil guardado, enquanto o token do Supabase renova e o perfil fresco chega
// em segundo plano. O papel (paciente/médico) muda raramente, por isso é seguro.
const profileCacheKey = (uid: string) => `tesed_profile_${uid}`;

async function loadCachedProfile(uid: string): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCacheKey(uid));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

async function cacheProfile(p: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(profileCacheKey(p.id), JSON.stringify(p));
  } catch {
    // a cache é só otimização — ignorar falhas
  }
}

// --- Renovação "rolante" do token ------------------------------------------
// Em cada arranque / regresso a primeiro plano (com sessão), renovamos o token
// em SEGUNDO PLANO. Assim a validade do access token vai sendo empurrada para a
// frente e, para quem usa a app com regularidade, ele NUNCA expira entre
// aberturas → nunca apanha a renovação lenta do arranque a frio. É throttled
// para não fazer pedidos a mais. Não bloqueia o UI (nunca é aguardado no arranque).
let lastRollingRefreshAt = 0;
const ROLLING_REFRESH_THROTTLE_MS = 60 * 60 * 1000; // no máximo 1×/hora

async function rollingRefresh(): Promise<void> {
  const now = Date.now();
  if (now - lastRollingRefreshAt < ROLLING_REFRESH_THROTTLE_MS) return;
  lastRollingRefreshAt = now;
  try {
    await supabase.auth.refreshSession();
  } catch {
    // sem rede / refresh token inválido — o fluxo normal trata; ignorar
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  // Ref para o onAuthStateChange saber se estamos em recovery sem depender do
  // estado assíncrono (evita carregar profile/navegar durante o reset).
  const recoveringRef = useRef(false);
  const setRecovering = (v: boolean) => {
    recoveringRef.current = v;
    setRecoveringPassword(v);
  };
  // Ref para o handler de AppState ler o perfil atual sem recriar o efeito.
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  useEffect(() => {
    let active = true;

    // Rede de segurança: se o arranque estalar (ex.: getSession preso no cold
    // start), o spinner sai ao fim de 5s — a sessão/perfil entram depois pelo
    // onAuthStateChange e pela auto-recuperação assim que o Supabase responder.
    const safety = setTimeout(() => {
      if (active) setLoading(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session) {
          // Routing INSTANTÂNEO: usa o perfil em cache (leitura local rápida).
          // O spinner sai já (no finally) sem esperar pela rede/renovação do token.
          const cached = await loadCachedProfile(data.session.user.id);
          if (cached && active) setProfile(cached);
          registerForPush();
          rollingRefresh(); // mantém o token fresco (em segundo plano, não bloqueia)
          // Perfil fresco em SEGUNDO PLANO — sem await, não atrasa o arranque.
          fetchProfile(data.session.user.id).then((fresh) => {
            if (fresh && active) {
              setProfile(fresh);
              cacheProfile(fresh);
            }
          });
        }
      })
      .catch((e: any) => console.warn('[Tesed] getSession falhou:', e?.message ?? e))
      .finally(() => {
        // O spinner sai assim que temos sessão + perfil em cache (não espera o token).
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Link de recuperação: o Supabase emite PASSWORD_RECOVERY com uma sessão
      // temporária. Entramos em modo "definir nova password" (não navegar para a app).
      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession);
        setRecovering(true);
        setLoading(false);
        return;
      }
      // Durante o recovery, ignoramos o SIGNED_IN da sessão temporária (não
      // carregamos profile nem navegamos para a app — o ecrã é o de nova password).
      if (recoveringRef.current) {
        setSession(newSession);
        setLoading(false);
        return;
      }
      setSession(newSession);
      if (newSession) {
        const fresh = await fetchProfile(newSession.user.id);
        if (fresh) {
          setProfile(fresh);
          cacheProfile(fresh);
        } else {
          // Token ainda a renovar → usa a cache para não ficar sem perfil
          // (a auto-recuperação tenta de novo até obter o fresco).
          const cached = await loadCachedProfile(newSession.user.id);
          if (cached) setProfile(cached);
        }
        // Regista o dispositivo para push quando há sessão (no-op em Expo Go/web).
        registerForPush();
      } else {
        setProfile(null);
      }
    });

    // Deep links: quando a app abre por um link (ex.: recuperação de password),
    // extrai os tokens do URL e cria a sessão. No mobile o supabase-js não o faz
    // automaticamente (detectSessionInUrl: false), por isso tratamos aqui.
    // Os parâmetros do Supabase podem vir na QUERY (?a=b) OU no FRAGMENTO (#a=b),
    // por isso juntamos os dois. Pode ainda vir um `code` (fluxo PKCE).
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const all: Record<string, string> = {};
        // Query (?...) via Linking.parse
        const parsed = Linking.parse(url);
        Object.assign(all, (parsed.queryParams ?? {}) as Record<string, string>);
        // Fragmento (#...) — parse manual
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const frag = url.slice(hashIndex + 1);
          for (const pair of frag.split('&')) {
            const [k, v] = pair.split('=');
            if (k) all[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
          }
        }

        const isRecovery = all.type === 'recovery';
        // Entrar JÁ em modo recovery (antes do await) garante que o ecrã de nova
        // password aparece e que o RootNavigator não fica preso no spinner
        // (session sem profile). loading=false é essencial.
        if (isRecovery) {
          setRecovering(true);
          setLoading(false);
        }

        // Caso A: tokens diretos no URL.
        if (all.access_token && all.refresh_token) {
          await supabase.auth.setSession({
            access_token: all.access_token,
            refresh_token: all.refresh_token,
          });
          setLoading(false);
          return;
        }
        // Caso B: fluxo PKCE com `code` — troca por sessão.
        if (all.code) {
          await supabase.auth.exchangeCodeForSession(all.code);
          setLoading(false);
        }
      } catch (e: any) {
        console.warn('[Tesed] Falha a processar deep link:', e?.message ?? e);
        setLoading(false);
      }
    };
    // Em web, o supabase-js trata dos tokens no URL (detectSessionInUrl: true) e
    // o PASSWORD_RECOVERY chega via onAuthStateChange — o tratamento manual via
    // Linking é só para o deep link tesed:// do mobile.
    let linkingSub: { remove: () => void } | undefined;
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then(handleUrl);
      linkingSub = Linking.addEventListener('url', (e: { url: string }) => handleUrl(e.url));
    }

    // Se a app volta a primeiro plano com sessão mas SEM perfil (ex.: o arranque
    // não o conseguiu carregar), tenta de novo — evita ter de fechar e reabrir.
    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !active || recoveringRef.current) return;
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      rollingRefresh(); // a cada regresso a primeiro plano, mantém o token fresco
      if (!profileRef.current) {
        const p = await fetchProfile(data.session.user.id);
        if (active && p) {
          setProfile(p);
          cacheProfile(p);
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
      linkingSub?.remove();
      appStateSub.remove();
    };
  }, []);

  // Auto-recuperação: se há sessão mas o perfil ainda não carregou (típico no
  // arranque a frio, com o token do Supabase ainda a renovar), tenta a cada 1s
  // até conseguir — a app recupera SOZINHA, sem o utilizador fechar e reabrir.
  useEffect(() => {
    if (!session || profile || recoveringPassword) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      const p = await fetchProfile(session.user.id);
      if (!cancelled && p) {
        setProfile(p);
        cacheProfile(p);
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, profile, recoveringPassword]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpPatient: AuthState['signUpPatient'] = async ({
    email,
    password,
    fullName,
    consent,
    dateOfBirth,
    phone,
  }) => {
    if (!consent) {
      throw new Error('É necessário aceitar a política de privacidade para continuar.');
    }
    // Passamos nome, data de nascimento, telemóvel e consentimento na metadata
    // do signup: o trigger handle_new_user cria o perfil e regista tudo de forma
    // fiável, mesmo com confirmação de email ativa (ainda sem sessão no cliente).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // O email de confirmação redireciona para ONDE o utilizador se registou:
        // web -> https://app.tesed.pt/confirm ; mobile -> tesed://confirm (deep link).
        // (O reset de password já faz o mesmo via redirectTo no ForgotPasswordScreen.)
        emailRedirectTo: Linking.createURL('confirm'),
        data: {
          full_name: fullName,
          consent: 'true',
          date_of_birth: dateOfBirth ?? '',
          phone: phone ?? '',
          // Idioma do registo: fica no user_metadata (template de email) e é lido
          // pelo handle_new_user para profiles.locale.
          locale: getLang(),
        },
      },
    });
    if (error) throw error;

    // Se a confirmação de email estiver ativa, o signUp NÃO devolve sessão:
    // o paciente tem de confirmar pelo email antes de entrar. Se estiver
    // desativada, fica logo com sessão e a navegação por papel trata do resto.
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    // Remove o token deste dispositivo antes de sair (não recebe push de outra conta).
    await unregisterForPush();
    // Limpa o perfil em cache (privacidade — não deixar dados após o logout).
    if (session) AsyncStorage.removeItem(profileCacheKey(session.user.id)).catch(() => {});
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const completePasswordReset = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    // Password definida: sai do modo recovery e termina a sessão temporária
    // para o utilizador entrar de novo com a nova password.
    setRecovering(false);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session) setProfile(await fetchProfile(session.user.id));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        recoveringPassword,
        completePasswordReset,
        signIn,
        signOut,
        signUpPatient,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}

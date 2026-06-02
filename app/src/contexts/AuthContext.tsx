import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
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

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.warn('[Tesed] Falha a carregar o perfil:', error.message);
    return null;
  }
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        setProfile(await fetchProfile(data.session.user.id));
        registerForPush();
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Link de recuperação: o Supabase emite PASSWORD_RECOVERY com uma sessão
      // temporária. Entramos em modo "definir nova password" (não navegar para a app).
      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession);
        setRecoveringPassword(true);
        setLoading(false);
        return;
      }
      setSession(newSession);
      setProfile(newSession ? await fetchProfile(newSession.user.id) : null);
      // Regista o dispositivo para push quando há sessão (no-op em Expo Go/web).
      if (newSession) registerForPush();
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

        // Caso A: tokens diretos no URL.
        if (all.access_token && all.refresh_token) {
          await supabase.auth.setSession({
            access_token: all.access_token,
            refresh_token: all.refresh_token,
          });
          if (isRecovery) setRecoveringPassword(true);
          return;
        }
        // Caso B: fluxo PKCE com `code` — troca por sessão.
        if (all.code) {
          await supabase.auth.exchangeCodeForSession(all.code);
          if (isRecovery) setRecoveringPassword(true);
        }
      } catch (e: any) {
        console.warn('[Tesed] Falha a processar deep link:', e?.message ?? e);
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const linkingSub = Linking.addEventListener('url', (e: { url: string }) => handleUrl(e.url));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

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
        data: {
          full_name: fullName,
          consent: 'true',
          date_of_birth: dateOfBirth ?? '',
          phone: phone ?? '',
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const completePasswordReset = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    // Password definida: sai do modo recovery e termina a sessão temporária
    // para o utilizador entrar de novo com a nova password.
    setRecoveringPassword(false);
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

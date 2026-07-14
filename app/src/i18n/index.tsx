import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { pt, en } from './strings';

/**
 * Internacionalização (i18n) — visão do paciente. Contexto leve, sem dependências
 * externas: guarda o idioma escolhido no dispositivo e expõe o dicionário atual
 * como `t`. Default: PT. O terapeuta não tem botão de troca (fica sempre em PT).
 */
export type Language = 'pt' | 'en';

const DICTS = { pt, en };
const STORAGE_KEY = 'tesed.lang';

// Idioma atual guardado ao nível do módulo, sincronizado pelo LanguageProvider.
// Permite que FUNÇÕES PURAS (não-componentes: datas, idades, confirmações, erros
// de anexos) obtenham as strings certas via getStrings(), sem serem hooks.
let currentLang: Language = 'pt';

/** Dicionário do idioma atual, para uso FORA de componentes React. */
export function getStrings() {
  return DICTS[currentLang];
}

/** Idioma atual (fora de componentes React) — ex.: metadata do registo. */
export function getLang(): Language {
  return currentLang;
}

/**
 * Sincroniza o idioma com o SERVIDOR (para EMAILS e PUSH saberem o idioma do
 * paciente). Só escreve se houver sessão; falhas são ignoradas (o próximo
 * toggle/login volta a tentar). Chamada com DEBOUNCE — ver setLang.
 */
async function syncLocaleToServer(l: Language) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.rpc('set_my_locale', { p_locale: l });
  } catch {
    // sem rede / RPC ainda não aplicada — não bloquear a app
  }
}

type I18nValue = {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
  /** Dicionário do idioma atual (mesma forma que `pt`). */
  t: typeof pt;
};

const I18nContext = createContext<I18nValue>({
  lang: 'pt',
  setLang: () => {},
  toggle: () => {},
  t: pt,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('pt');
  // Timer do debounce da sincronização com o servidor (toques rápidos = 1 escrita).
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega a preferência guardada (uma vez, no arranque).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'pt' || v === 'en') {
          currentLang = v; // sincroniza já (síncrono) para os helpers puros
          setLangState(v);
        }
      })
      .catch(() => {});
  }, []);

  // Após o LOGIN, garante que o servidor tem o idioma atual do dispositivo
  // (cobre o caso de o paciente trocar de idioma ANTES de entrar).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') syncLocaleToServer(currentLang);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setLang = (l: Language) => {
    currentLang = l; // sincroniza ANTES do re-render (helpers puros ficam certos)
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
    // DEBOUNCE: só sincroniza com o servidor ~1.5s depois de estabilizar, para
    // trocas rápidas resultarem numa ÚNICA escrita (do valor final).
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncLocaleToServer(l), 1500);
  };

  const value: I18nValue = {
    lang,
    setLang,
    toggle: () => setLang(lang === 'pt' ? 'en' : 'pt'),
    t: DICTS[lang],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

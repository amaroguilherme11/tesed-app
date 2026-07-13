import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const setLang = (l: Language) => {
    currentLang = l; // sincroniza ANTES do re-render (helpers puros ficam certos)
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
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

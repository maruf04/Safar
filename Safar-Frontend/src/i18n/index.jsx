import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bn from './bn';
import { setFormatLang, localizeDigits } from '../lib/format';

/*
  Tiny i18n layer.
  - Write UI text in English and wrap it: t('Search trains')
  - Placeholders: t('{n} seats left', { n: 4 })  (numbers become Bengali digits in bn)
  - Bengali strings live in ./bn.js, keyed by the English text. Missing keys fall back to English.
*/

const STORAGE_KEY = 'lang';
const LangContext = createContext(null);

const readInitial = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'bn' || saved === 'en') return saved;
  } catch (e) { /* storage blocked */ }
  return 'en';
};

const interpolate = (str, vars, lang) =>
  vars
    ? str.replace(/\{(\w+)\}/g, (m, k) => {
        if (!(k in vars)) return m;
        const v = vars[k];
        return typeof v === 'number' ? localizeDigits(String(v), lang) : String(v);
      })
    : str;

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(readInitial);

  // Keep the formatters in sync during render so children format with the right language
  setFormatLang(lang);

  useEffect(() => {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }, [lang]);

  const t = useCallback((text, vars) => {
    const translated = lang === 'bn' && bn[text] ? bn[text] : text;
    return interpolate(translated, vars, lang);
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang: setLangState,
    toggleLang: () => setLangState((l) => (l === 'bn' ? 'en' : 'bn')),
    t,
  }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useT = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useT must be used inside <LangProvider>');
  return ctx;
};

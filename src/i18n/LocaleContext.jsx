import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { t } from './strings';

/** @typedef {import('./strings').Locale} Locale */

const STORAGE_KEY = 'mg-locale';

const LocaleContext = createContext({
  locale: /** @type {Locale} */ ('en'),
  setLocale: () => {},
  tr: () => '',
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(
    /** @type {Locale} */ (
      typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'it'
        ? 'it'
        : 'en'
    ),
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'it' || saved === 'en') setLocaleState(saved);
  }, []);

  const setLocale = useCallback((/** @type {Locale} */ next) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const tr = useCallback(
    (key, vars) => t(locale, key, vars),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, 'pageTitle');
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, tr }), [locale, setLocale, tr]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

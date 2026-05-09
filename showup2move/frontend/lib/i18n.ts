"use client";

import { createContext, useContext } from "react";

type TranslationFunction = (key: string, params?: Record<string, string | number>) => string;

const I18nContext = createContext<{ t: TranslationFunction }>({
  t: (key: string) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const t: TranslationFunction = (key: string, params?: Record<string, string | number>) => {
    // Simple translation function that returns the key for now
    // You can extend this to load actual translations from JSON files
    let translation = key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{${paramKey}}`, String(value));
      });
    }
    
    return translation;
  };

  return <I18nContext.Provider value={{ t }}>{children}</I18nContext.Provider>;
}

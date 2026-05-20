"use client";

import { createContext, useContext } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { InterfaceLanguage, TranslationKey } from "@/shared/i18n";
import { defaultInterfaceLanguage, translations } from "@/shared/i18n";

type I18nContextValue = {
  language: InterfaceLanguage;
  setLanguage: Dispatch<SetStateAction<InterfaceLanguage>>;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  language: defaultInterfaceLanguage,
  setLanguage: () => undefined,
  t: (key) => translations[defaultInterfaceLanguage][key],
});

export function I18nProvider({
  children,
  language,
  setLanguage,
}: {
  children: ReactNode;
  language: InterfaceLanguage;
  setLanguage: Dispatch<SetStateAction<InterfaceLanguage>>;
}) {
  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t: (key) => translations[language][key],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

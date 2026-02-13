"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  translations,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const COOKIE_NAME = "cp_lang";

function readCookieLang() {
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  return value === "bg" ? "bg" : value === "en" ? "en" : null;
}

function persistLanguage(lang: Language) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000`;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(COOKIE_NAME, lang);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const stored = localStorage.getItem(COOKIE_NAME);
    if (stored === "en" || stored === "bg") {
      return stored;
    }
    const cookieLang = readCookieLang();
    return cookieLang ?? "en";
  });

  useEffect(() => {
    persistLanguage(lang);
  }, [lang]);

  const setLang = useCallback(
    (value: Language) => {
      if (value === lang) {
        return;
      }

      // Persist before refresh so server components receive updated cookie.
      persistLanguage(value);
      setLangState(value);
      router.refresh();
      // Force a full server render so cookie-based translations update consistently.
      window.setTimeout(() => window.location.reload(), 0);
    },
    [lang, router]
  );

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? translations.en[key],
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (key: TranslationKey) => translations.en[key] ?? key,
    };
  }
  return context;
}

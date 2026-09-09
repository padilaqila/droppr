"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { id, type Dictionary } from "./dictionaries/id";
import { en } from "./dictionaries/en";
import {
  getLanguagePreference,
  setLanguagePreference,
  type LanguagePreference,
  LANGUAGE_CHANGE_EVENT,
} from "@/lib/utils/language-prefs";

export type Locale = "id" | "en";

interface LanguageContextType {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (pref: LanguagePreference) => void;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: (path: string) => string;
  dictionary: Dictionary;
  isId: boolean;
  isEn: boolean;
}

const dictionaries: Record<Locale, Dictionary> = { id, en };

const LanguageContext = createContext<LanguageContextType | null>(null);

function resolveLocale(pref: LanguagePreference): Locale {
  if (pref === "id") return "id";
  if (pref === "en") return "en";
  if (typeof navigator !== "undefined") {
    const navLang = (navigator.language || "").toLowerCase();
    if (navLang.startsWith("id")) return "id";
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>("system");
  const [locale, setLocaleState] = useState<Locale>("id");

  // Initialize preference & locale
  useEffect(() => {
    const initialPref = getLanguagePreference();
    setPreferenceState(initialPref);
    const resolved = resolveLocale(initialPref);
    setLocaleState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.lang = resolved;
    }
  }, []);

  // Listen for language change events
  useEffect(() => {
    const handleLangChange = (e: any) => {
      const newPref = (e.detail as LanguagePreference) || getLanguagePreference();
      setPreferenceState(newPref);
      const resolved = resolveLocale(newPref);
      setLocaleState(resolved);
      if (typeof document !== "undefined") {
        document.documentElement.lang = resolved;
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLangChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLangChange);
  }, []);

  const setPreference = useCallback((pref: LanguagePreference) => {
    setPreferenceState(pref);
    setLanguagePreference(pref);
    const resolved = resolveLocale(pref);
    setLocaleState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.lang = resolved;
    }
  }, []);

  const setLocale = useCallback(
    (loc: Locale) => {
      setPreference(loc);
    },
    [setPreference]
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === "id" ? "en" : "id");
  }, [locale, setLocale]);

  // Nested translation resolver: t("nav.dashboard") -> "Dashboard"
  const t = useCallback(
    (path: string): string => {
      const dict = dictionaries[locale] || id;
      const keys = path.split(".");
      let current: any = dict;

      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          // Fallback to Indonesian if key is missing in other locale
          let fallback: any = id;
          for (const fbKey of keys) {
            if (fallback && typeof fallback === "object" && fbKey in fallback) {
              fallback = fallback[fbKey];
            } else {
              return path;
            }
          }
          return typeof fallback === "string" ? fallback : path;
        }
      }

      return typeof current === "string" ? current : path;
    },
    [locale]
  );

  const dictionary = useMemo(() => dictionaries[locale] || id, [locale]);

  const value = useMemo(
    () => ({
      locale,
      preference,
      setPreference,
      setLocale,
      toggleLocale,
      t,
      dictionary,
      isId: locale === "id",
      isEn: locale === "en",
    }),
    [locale, preference, setPreference, setLocale, toggleLocale, t, dictionary]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      locale: "id" as Locale,
      preference: "system" as LanguagePreference,
      setPreference: () => {},
      setLocale: () => {},
      toggleLocale: () => {},
      t: (path: string) => path,
      dictionary: id,
      isId: true,
      isEn: false,
    };
  }
  return context;
}

"use client";

export type LanguagePreference = "system" | "id" | "en";

export const LANGUAGE_PREF_KEY = "droppr_language_pref";
export const LANGUAGE_CHANGE_EVENT = "droppr_language_change";

/**
 * Get saved language preference from localStorage ("system" | "id" | "en")
 */
export function getLanguagePreference(): LanguagePreference {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(LANGUAGE_PREF_KEY);
    if (saved === "id" || saved === "en" || saved === "system") {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "system";
}

/**
 * Save language preference to localStorage and trigger change event
 */
export function setLanguagePreference(pref: LanguagePreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_PREF_KEY, pref);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: pref }));
  } catch (err) {
    console.error("Failed to save language preference:", err);
  }
}

/**
 * Resolve effective language ("id" or "en") considering system / browser language
 */
export function getEffectiveLanguage(pref?: LanguagePreference): "id" | "en" {
  const chosen = pref || getLanguagePreference();
  if (chosen === "id") return "id";
  if (chosen === "en") return "en";

  // System auto-detection
  if (typeof navigator !== "undefined") {
    const navLang = (navigator.language || "").toLowerCase();
    if (navLang.startsWith("id")) {
      return "id";
    }
  }
  return "en";
}

/**
 * Smart detection whether a text is mostly Indonesian or English
 */
export function detectTextLanguage(text: string): "id" | "en" {
  if (!text || !text.trim()) return "en";

  const lower = text.toLowerCase();

  // Common Indonesian signature words & airdrop terms
  const idKeywords = [
    "yang", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "adalah", "bisa",
    "sudah", "dan", "dengan", "tugas", "garapan", "garap", "selesai", "hari", "harian", "klik",
    "masuk", "daftar", "dompet", "ambil", "simpan", "panduan", "cara", "hubungkan",
    "kirim", "token", "jangan", "hanya", "juga", "atau", "seperti", "lakukan",
    "wajib", "hadiah", "pemenang", "simak", "kalian", "cek", "tautan", "berikut",
    "modal", "gratis", "gratisan", "tutor", "langkah", "buka", "koneksikan", "gabung"
  ];

  // Common English signature words & airdrop terms
  const enKeywords = [
    "the", "is", "are", "and", "to", "of", "in", "for", "with", "on", "at",
    "this", "that", "from", "your", "claim", "task", "tasks", "wallet", "wallets", "connect",
    "check", "complete", "daily", "faucet", "step", "steps", "guide", "click", "follow",
    "retweet", "join", "register", "eligibility", "snapshot", "reward", "rewards", "about",
    "here", "free", "details", "rules", "airdrop", "testnet", "mainnet", "whitelist"
  ];

  let idScore = 0;
  let enScore = 0;

  // Simple token matching
  const words = lower.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
  for (const w of words) {
    if (idKeywords.includes(w)) idScore += 2;
    if (enKeywords.includes(w)) enScore += 2;
  }

  // If explicit Indonesian grammatical clues exist
  if (/(\b(di|ke|dari)\s+[a-z]+|\b(me|ber|ter)[a-z]{3,})/i.test(lower)) {
    idScore += 3;
  }

  return idScore >= enScore ? "id" : "en";
}

export interface TranslationActionInfo {
  shouldShowTranslate: boolean;
  detectedLang: "id" | "en";
  sourceLang: "id" | "en";
  targetLang: "id" | "en";
  buttonLabel: string;
  revertLabel: string;
}

/**
 * Get translation target, source language, and button label dynamically
 * Sesuai aturan:
 * - Jika bahasa sistem = ID & postingan = ID -> tidak perlu translate (shouldShowTranslate = false).
 * - Jika bahasa sistem = ID & postingan = EN -> tombol "Terjemahkan ke Indonesia" (shouldShowTranslate = true).
 * - Jika bahasa sistem = EN & postingan = EN -> tidak perlu translate (shouldShowTranslate = false).
 * - Jika bahasa sistem = EN & postingan = ID -> tombol "Translate to English" (shouldShowTranslate = true).
 */
export function getTranslationAction(
  text: string,
  userLang: "id" | "en" = "id",
  isTranslated: boolean = false
): TranslationActionInfo {
  if (!text || !text.trim()) {
    return {
      shouldShowTranslate: false,
      detectedLang: "id",
      sourceLang: "id",
      targetLang: "en",
      buttonLabel: "",
      revertLabel: "",
    };
  }

  const detected = detectTextLanguage(text);

  // Jika belum diterjemahkan dan bahasa teks SAMA dengan bahasa sistem pengguna -> TIDAK PERLU tombol translate
  if (!isTranslated && detected === userLang) {
    return {
      shouldShowTranslate: false,
      detectedLang: detected,
      sourceLang: detected,
      targetLang: userLang === "id" ? "en" : "id",
      buttonLabel: "",
      revertLabel: userLang === "id" ? "Teks Asli" : "Original Text",
    };
  }

  // Jika bahasa teks BERLAWANAN dengan bahasa sistem (atau sedang dalam mode hasil terjemahan)
  if (userLang === "id") {
    return {
      shouldShowTranslate: true,
      detectedLang: detected,
      sourceLang: "en",
      targetLang: "id",
      buttonLabel: isTranslated ? "✓ Teks Asli (EN)" : "Terjemahkan ke Indonesia",
      revertLabel: "Teks Asli (EN)",
    };
  } else {
    return {
      shouldShowTranslate: true,
      detectedLang: detected,
      sourceLang: "id",
      targetLang: "en",
      buttonLabel: isTranslated ? "✓ Original Text (ID)" : "Translate to English",
      revertLabel: "Original Text (ID)",
    };
  }
}

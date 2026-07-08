import { LOCALE_COOKIE, isLocale, type Locale } from "./locales";

export const LOCALE_STORAGE_KEY = LOCALE_COOKIE;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function persistLocale(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // private browsing or storage quota
    }
    emit();
  }
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function getClientLocale(): Locale | null {
  return readStoredLocale();
}

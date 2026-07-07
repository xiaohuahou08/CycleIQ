export const LOCALE_COOKIE = "cycleiq_locale";
export const DEFAULT_LOCALE = "en" as const;

export type Locale = "en" | "zh";

export const LOCALES: readonly Locale[] = ["en", "zh"] as const;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "zh";
}

export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function intlLocale(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

import type { Locale } from "@/lib/i18n/locales";
import en, { type Messages } from "./en";
import zh from "./zh";

export type { Messages };
export const messages: Record<Locale, Messages> = { en, zh };
export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? en;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { getMessages, type Messages } from "@/messages";
import { DEFAULT_LOCALE, intlLocale, type Locale } from "./locales";
import { translate } from "./translate";

type Namespace = keyof Messages;

interface LocaleContextValue {
  locale: Locale;
  intlLocale: string;
  messages: Messages;
  fallbackMessages: Messages;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const locale = initialLocale ?? DEFAULT_LOCALE;
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      intlLocale: intlLocale(locale),
      messages: getMessages(locale),
      fallbackMessages: getMessages("en"),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useTranslations<N extends Namespace>(namespace: N) {
  const { messages, fallbackMessages } = useLocale();
  const tree = messages[namespace] as Record<string, unknown>;
  const fallbackTree = fallbackMessages[namespace] as Record<string, unknown>;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(
        tree as Parameters<typeof translate>[0],
        key,
        params,
        fallbackTree as Parameters<typeof translate>[0]
      ),
    [tree, fallbackTree]
  );

  return { t };
}

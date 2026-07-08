"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getMessages, type Messages } from "@/messages";
import { DEFAULT_LOCALE, intlLocale, type Locale } from "./locales";
import {
  getClientLocale,
  persistLocale,
  subscribeLocale,
} from "./locale-storage";
import { translate } from "./translate";

type Namespace = keyof Messages;

interface LocaleContextValue {
  locale: Locale;
  intlLocale: string;
  messages: Messages;
  fallbackMessages: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const serverLocale = initialLocale ?? DEFAULT_LOCALE;
  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    getClientLocale,
    () => null
  );
  const locale = storedLocale ?? serverLocale;

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      intlLocale: intlLocale(locale),
      messages: getMessages(locale),
      fallbackMessages: getMessages("en"),
      setLocale,
    }),
    [locale, setLocale]
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

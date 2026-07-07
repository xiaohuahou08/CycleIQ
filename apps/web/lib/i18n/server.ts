import { cookies } from "next/headers";
import { getMessages, type Messages } from "@/messages";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";
import { translate } from "./translate";

export async function getLocaleFromCookies(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getServerTranslations<N extends keyof Messages>(namespace: N) {
  const locale = await getLocaleFromCookies();
  const messages = getMessages(locale);
  const fallbackMessages = getMessages("en");
  const tree = messages[namespace] as Parameters<typeof translate>[0];
  const fallbackTree = fallbackMessages[namespace] as Parameters<typeof translate>[0];
  return (key: string, params?: Record<string, string | number>) =>
    translate(tree, key, params, fallbackTree);
}

type MessageValue = string | MessageTree;
type MessageTree = { readonly [key: string]: MessageValue };

function getNested(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let current: MessageValue | undefined = tree;
  for (const part of parts) {
    if (current == null || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

export function translate(
  tree: MessageTree,
  key: string,
  params?: Record<string, string | number>,
  fallbackTree?: MessageTree
): string {
  const raw = getNested(tree, key) ?? (fallbackTree ? getNested(fallbackTree, key) : undefined);
  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    return key;
  }
  return interpolate(raw, params);
}

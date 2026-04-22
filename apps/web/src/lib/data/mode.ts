export type DataMode = "supabase" | "memory";

const STORAGE_KEY = "cycleiq.dataMode";

export function getDataMode(): DataMode {
  if (typeof window === "undefined") return "supabase";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "memory" ? "memory" : "supabase";
}

export function setDataMode(mode: DataMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}


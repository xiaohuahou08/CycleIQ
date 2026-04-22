"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const current = useMemo(() => {
    if (!mounted) return null;
    return theme === "system" ? systemTheme : theme;
  }, [mounted, systemTheme, theme]);

  const isDark = current === "dark";

  return (
    <button
      type="button"
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4 text-[color:var(--muted)]" />
      ) : (
        <Moon className="h-4 w-4 text-[color:var(--muted)]" />
      )}
    </button>
  );
}


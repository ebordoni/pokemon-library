import { create } from "zustand";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage may be unavailable (private mode) — theme still applies for the session
  }
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }
  // Fall back to whatever the anti-flash inline script set on <html>
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
  setTheme: (theme: Theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

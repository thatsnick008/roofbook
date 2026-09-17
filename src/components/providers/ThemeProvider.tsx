"use client";

import * as React from "react";

type Theme = "light" | "dark" | "eink" | "system";
type ResolvedTheme = "light" | "dark" | "eink";

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
  toggle: () => {}
});

export const useTheme = () => React.useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolved, setResolved] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const stored = (window.localStorage.getItem("pcc-theme") as Theme | null) ?? "system";
    setThemeState(stored);
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.classList.toggle("eink", next === "eink");
      document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    window.localStorage.setItem("pcc-theme", next);
    setThemeState(next);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === "light" ? "dark" : resolved === "dark" ? "eink" : "light")
    }),
    [theme, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

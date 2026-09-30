import { useState, useEffect } from "react";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("stocklens-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {}
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  try {
    localStorage.setItem("stocklens-theme", theme);
  } catch {}
  window.dispatchEvent(new CustomEvent("stocklens-theme-change", { detail: theme }));
}

// Initialize immediately upon module load
if (typeof window !== "undefined") {
  const initial = getInitialTheme();
  document.documentElement.setAttribute("data-theme", initial);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(initial);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      const current = document.documentElement.getAttribute("data-theme") as Theme;
      if (current === "light" || current === "dark") return current;
    }
    return getInitialTheme();
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      } else {
        const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
        setTheme(current);
      }
    };
    window.addEventListener("stocklens-theme-change", handler);
    return () => window.removeEventListener("stocklens-theme-change", handler);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return { theme, toggleTheme, isDark: theme === "dark" };
}

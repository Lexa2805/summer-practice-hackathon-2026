"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "showup2move:theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("showup2move:theme-changed", { detail: theme }));
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    function handleChange(event: Event) {
      if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) return;
      const newTheme = getStoredTheme();
      setTheme(newTheme);
      applyTheme(newTheme);
    }

    window.addEventListener("showup2move:theme-changed", handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener("showup2move:theme-changed", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  return {
    theme,
    setTheme: (value: Theme) => {
      setTheme(value);
      setStoredTheme(value);
    },
    toggleTheme
  };
}

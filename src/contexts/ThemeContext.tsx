import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getTheme, setTheme as setThemeDb } from "../lib/database";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getSystemTheme());
  const [initialized, setInitialized] = useState(false);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getTheme();
        if (savedTheme) {
          setThemeState(savedTheme);
          applyTheme(savedTheme);
        } else {
          // No saved theme, use system preference
          const systemTheme = getSystemTheme();
          applyTheme(systemTheme);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
        applyTheme(getSystemTheme());
      } finally {
        setInitialized(true);
      }
    };
    loadTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = async (e: MediaQueryListEvent) => {
      // Only auto-update if no theme is saved
      const savedTheme = await getTheme();
      if (!savedTheme) {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      await setThemeDb(newTheme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Apply theme on state change
  useEffect(() => {
    if (initialized) {
      applyTheme(theme);
    }
  }, [theme, initialized]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

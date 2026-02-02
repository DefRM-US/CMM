import type React from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { darkColors, lightColors } from './colors';
import { radius, spacing } from './spacing';
import type { ColorScheme, Theme, ThemeContextValue } from './types';
import { typography } from './typography';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial color scheme. Defaults to system preference. */
  defaultColorScheme?: ColorScheme;
  /** If true, follows system color scheme changes. Defaults to true. */
  followSystem?: boolean;
}

function createTheme(colorScheme: ColorScheme): Theme {
  return {
    colorScheme,
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    typography,
    spacing,
    radius,
  };
}

function getSystemColorScheme(): ColorScheme {
  const systemScheme = Appearance.getColorScheme();
  return systemScheme === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({
  children,
  defaultColorScheme,
  followSystem = true,
}: ThemeProviderProps): React.JSX.Element {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(
    () => defaultColorScheme ?? getSystemColorScheme(),
  );

  // Listen for system color scheme changes
  useEffect(() => {
    if (!followSystem) return;

    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      if (newScheme) {
        setColorSchemeState(newScheme);
      }
    });

    return () => subscription.remove();
  }, [followSystem]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const theme = useMemo(() => createTheme(colorScheme), [colorScheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colorScheme,
      setColorScheme,
      toggleColorScheme,
    }),
    [theme, colorScheme, setColorScheme, toggleColorScheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

import { useContext } from 'react';

import { ThemeContext } from './ThemeProvider';
import type { ThemeContextValue } from './types';

/**
 * Hook to access the current theme context.
 * Must be used within a ThemeProvider.
 *
 * @example
 * ```tsx
 * const { theme, colorScheme, toggleColorScheme } = useTheme();
 *
 * return (
 *   <View style={{ backgroundColor: theme.colors.background }}>
 *     <Text style={{ color: theme.colors.foreground }}>
 *       Current theme: {colorScheme}
 *     </Text>
 *     <Button onPress={toggleColorScheme} title="Toggle Theme" />
 *   </View>
 * );
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

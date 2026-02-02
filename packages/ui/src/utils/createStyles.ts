import type { StyleSheet as RNStyleSheet } from 'react-native';

import type { Theme } from '../theme/types';

type StyleSheetStyles = ReturnType<typeof RNStyleSheet.create>;
type StylesCreator<T extends StyleSheetStyles> = (theme: Theme) => T;

/**
 * Helper type for creating themed styles.
 * Use with StyleSheet.create() and useTheme() for type-safe themed styles.
 *
 * @example
 * ```tsx
 * const createStyles = (theme: Theme) => StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing[4],
 *   },
 *   text: {
 *     color: theme.colors.foreground,
 *     fontSize: theme.typography.fontSize.base,
 *   },
 * });
 *
 * function MyComponent() {
 *   const { theme } = useTheme();
 *   const styles = createStyles(theme);
 *
 *   return (
 *     <View style={styles.container}>
 *       <Text style={styles.text}>Hello</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export type ThemedStylesCreator<T extends StyleSheetStyles> = StylesCreator<T>;

/**
 * Creates a memoization wrapper for themed styles to avoid recreating styles on every render.
 * Only recreates styles when the theme actually changes.
 *
 * @example
 * ```tsx
 * const useStyles = createThemedStyles((theme) => StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *   },
 * }));
 *
 * function MyComponent() {
 *   const styles = useStyles();
 *   return <View style={styles.container} />;
 * }
 * ```
 */
export function createThemedStyles<T extends StyleSheetStyles>(
  stylesCreator: StylesCreator<T>,
): () => T {
  // This is a factory function that returns a hook
  // The actual memoization happens in the component using useMemo
  // We return the creator function to be used with the theme
  let cachedTheme: Theme | null = null;
  let cachedStyles: T | null = null;

  return function useThemedStyles(): T {
    // This needs to be called inside a component with useTheme
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTheme } = require('../theme/useTheme');
    const { theme } = useTheme();

    if (cachedTheme !== theme || !cachedStyles) {
      cachedTheme = theme;
      cachedStyles = stylesCreator(theme);
    }

    return cachedStyles;
  };
}

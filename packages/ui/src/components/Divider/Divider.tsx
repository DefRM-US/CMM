import type React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export interface DividerProps extends ViewProps {
  /** Orientation of the divider */
  orientation?: 'horizontal' | 'vertical';
  /** Thickness of the divider line */
  thickness?: number;
  /** Color override (defaults to theme border color) */
  color?: string;
  /** Spacing (margin) around the divider */
  spacing?: number;
}

/**
 * Divider component for visual separation.
 *
 * @example
 * ```tsx
 * // Horizontal divider (default)
 * <Divider />
 *
 * // Vertical divider
 * <Divider orientation="vertical" />
 *
 * // With custom spacing
 * <Divider spacing={16} />
 * ```
 */
export function Divider({
  orientation = 'horizontal',
  thickness = 1,
  color,
  spacing = 0,
  style,
  ...props
}: DividerProps): React.JSX.Element {
  const { theme } = useTheme();

  const dividerColor = color ?? theme.colors.border;

  const baseStyle = StyleSheet.create({
    horizontal: {
      height: thickness,
      backgroundColor: dividerColor,
      marginVertical: spacing,
      alignSelf: 'stretch',
    },
    vertical: {
      width: thickness,
      backgroundColor: dividerColor,
      marginHorizontal: spacing,
      alignSelf: 'stretch',
    },
  });

  return (
    <View
      style={[orientation === 'horizontal' ? baseStyle.horizontal : baseStyle.vertical, style]}
      accessibilityRole="none"
      {...props}
    />
  );
}

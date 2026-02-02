import type React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ThemedText } from '../../Typography';
import { useTheme } from '../../theme/useTheme';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline';

export interface BadgeProps {
  /** Badge text */
  children: string;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Badge component for status indicators and labels.
 *
 * @example
 * ```tsx
 * <Badge>Default</Badge>
 * <Badge variant="primary">Active</Badge>
 * <Badge variant="destructive">Error</Badge>
 * <Badge variant="outline">Draft</Badge>
 * ```
 */
export function Badge({ children, variant = 'default', style }: BadgeProps): React.JSX.Element {
  const { theme } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; textColor: string } => {
    const variants: Record<BadgeVariant, { container: ViewStyle; textColor: string }> = {
      default: {
        container: {
          backgroundColor: theme.colors.muted,
        },
        textColor: theme.colors.foreground,
      },
      primary: {
        container: {
          backgroundColor: `${theme.colors.primary}26`, // 15% opacity
          borderWidth: 1,
          borderColor: `${theme.colors.primary}66`, // 40% opacity
        },
        textColor: theme.colors.foreground,
      },
      secondary: {
        container: {
          backgroundColor: theme.colors.secondary,
        },
        textColor: theme.colors.secondaryForeground,
      },
      destructive: {
        container: {
          backgroundColor: theme.colors.destructive,
        },
        textColor: theme.colors.destructiveForeground,
      },
      outline: {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        textColor: theme.colors.foreground,
      },
    };

    return variants[variant];
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[styles.container, { borderRadius: theme.radius.md }, variantStyles.container, style]}
    >
      <ThemedText
        style={[
          styles.text,
          {
            color: variantStyles.textColor,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        ]}
      >
        {children.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: {
    letterSpacing: 0.5,
  },
});

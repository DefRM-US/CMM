import type React from 'react';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '../../Typography';
import { minTouchTarget } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button text */
  children: string;
  /** Click handler */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional style */
  style?: ViewStyle;
  /** Accessibility label (defaults to children) */
  accessibilityLabel?: string;
}

/**
 * Button component with DefRM design system styling.
 *
 * @example
 * ```tsx
 * <Button onPress={handleSubmit}>Submit</Button>
 * <Button variant="outline" size="sm" onPress={handleCancel}>Cancel</Button>
 * <Button variant="destructive" onPress={handleDelete}>Delete</Button>
 * ```
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = useCallback(() => setIsHovered(true), []);
  const handleHoverOut = useCallback(() => setIsHovered(false), []);

  const sizeStyles = {
    sm: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      minHeight: 32,
    },
    md: {
      paddingVertical: theme.spacing[2] + 2,
      paddingHorizontal: theme.spacing[4],
      minHeight: minTouchTarget,
    },
    lg: {
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[6],
      minHeight: 48,
    },
  };

  const textSizes = {
    sm: theme.typography.fontSize.xs,
    md: theme.typography.fontSize.sm,
    lg: theme.typography.fontSize.base,
  };

  const getVariantStyles = (pressed: boolean, hovered: boolean) => {
    const baseStyles: ViewStyle = {
      borderWidth: 1,
      borderColor: 'transparent',
    };

    const variants: Record<ButtonVariant, { base: ViewStyle; text: string }> = {
      primary: {
        base: {
          backgroundColor: pressed
            ? theme.colors.primary
            : hovered
              ? `${theme.colors.primary}E6` // 90% opacity
              : theme.colors.primary,
          opacity: pressed ? 0.9 : 1,
        },
        text: theme.colors.primaryForeground,
      },
      secondary: {
        base: {
          backgroundColor: pressed
            ? theme.colors.secondary
            : hovered
              ? `${theme.colors.secondary}E6`
              : theme.colors.secondary,
          opacity: pressed ? 0.9 : 1,
        },
        text: theme.colors.secondaryForeground,
      },
      outline: {
        base: {
          backgroundColor: pressed
            ? `${theme.colors.primary}1A` // 10% opacity
            : hovered
              ? `${theme.colors.primary}0D` // 5% opacity
              : 'transparent',
          borderColor: theme.colors.input,
        },
        text: theme.colors.foreground,
      },
      ghost: {
        base: {
          backgroundColor: pressed
            ? theme.colors.accent
            : hovered
              ? `${theme.colors.accent}80`
              : 'transparent',
        },
        text: theme.colors.foreground,
      },
      destructive: {
        base: {
          backgroundColor: pressed
            ? theme.colors.destructive
            : hovered
              ? `${theme.colors.destructive}E6`
              : theme.colors.destructive,
          opacity: pressed ? 0.9 : 1,
        },
        text: theme.colors.destructiveForeground,
      },
    };

    return {
      ...baseStyles,
      ...variants[variant].base,
      textColor: variants[variant].text,
    };
  };

  const disabledStyles: ViewStyle = {
    opacity: 0.5,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled }}
      style={({ pressed }) => {
        const variantStyles = getVariantStyles(pressed, isHovered);
        return [
          styles.base,
          sizeStyles[size],
          variantStyles,
          fullWidth && styles.fullWidth,
          disabled && disabledStyles,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const variantStyles = getVariantStyles(pressed, isHovered);
        return (
          <ThemedText
            style={[
              styles.text,
              {
                fontSize: textSizes[size],
                color: disabled ? theme.colors.mutedForeground : variantStyles.textColor,
              },
            ]}
          >
            {children}
          </ThemedText>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

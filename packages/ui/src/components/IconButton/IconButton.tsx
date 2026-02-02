import type React from 'react';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { minTouchTarget } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  /** Icon element to render */
  icon: React.ReactNode;
  /** Click handler */
  onPress: () => void;
  /** Required accessibility label for screen readers */
  accessibilityLabel: string;
  /** Visual variant */
  variant?: IconButtonVariant;
  /** Size variant */
  size?: IconButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Icon-only button component with required accessibility label.
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<CloseIcon />}
 *   onPress={handleClose}
 *   accessibilityLabel="Close dialog"
 * />
 *
 * <IconButton
 *   icon={<MenuIcon />}
 *   onPress={toggleMenu}
 *   accessibilityLabel="Open menu"
 *   variant="ghost"
 *   size="lg"
 * />
 * ```
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  style,
}: IconButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = useCallback(() => setIsHovered(true), []);
  const handleHoverOut = useCallback(() => setIsHovered(false), []);

  const sizeValues = {
    sm: 32,
    md: minTouchTarget,
    lg: 52,
  };

  const buttonSize = sizeValues[size];

  const getVariantStyles = (pressed: boolean, hovered: boolean): ViewStyle => {
    const variants: Record<IconButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: pressed
          ? theme.colors.primary
          : hovered
            ? `${theme.colors.primary}E6`
            : theme.colors.primary,
        opacity: pressed ? 0.9 : 1,
      },
      secondary: {
        backgroundColor: pressed
          ? theme.colors.secondary
          : hovered
            ? `${theme.colors.secondary}E6`
            : theme.colors.secondary,
        opacity: pressed ? 0.9 : 1,
      },
      outline: {
        backgroundColor: pressed
          ? `${theme.colors.primary}1A`
          : hovered
            ? `${theme.colors.primary}0D`
            : 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.input,
      },
      ghost: {
        backgroundColor: pressed
          ? theme.colors.accent
          : hovered
            ? `${theme.colors.accent}80`
            : 'transparent',
      },
    };

    return variants[variant];
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: theme.radius.md,
        },
        getVariantStyles(pressed, isHovered),
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

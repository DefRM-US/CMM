import type React from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  type DimensionValue,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTheme } from '../../theme/useTheme';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

export interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width (number for pixels, string for percentage) */
  width?: DimensionValue;
  /** Height (number for pixels, string for percentage) */
  height?: DimensionValue;
  /** Number of text lines (only for variant="text") */
  lines?: number;
  /** Disable animation */
  disableAnimation?: boolean;
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Skeleton loading placeholder with animated shimmer effect.
 * Respects user's reduced motion preference.
 *
 * @example
 * ```tsx
 * // Text skeleton
 * <Skeleton variant="text" width="80%" />
 * <Skeleton variant="text" lines={3} />
 *
 * // Circular skeleton (avatar)
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * // Rectangular skeleton (image placeholder)
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  disableAnimation = false,
  style,
}: SkeletonProps): React.JSX.Element {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const shouldAnimate = !disableAnimation && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate) return;

    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.ease,
        useNativeDriver: false,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, shouldAnimate]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      theme.colors.muted,
      `${theme.colors.muted}80`, // Lighter in the middle
      theme.colors.muted,
    ],
  });

  const getDefaultDimensions = (): { width: DimensionValue; height: DimensionValue } => {
    switch (variant) {
      case 'text':
        return { width: '100%', height: 16 };
      case 'circular':
        return { width: 40, height: 40 };
      case 'rectangular':
        return { width: '100%', height: 120 };
    }
  };

  const defaults = getDefaultDimensions();
  const finalWidth = width ?? defaults.width;
  const finalHeight = height ?? defaults.height;

  const getBorderRadius = (): number => {
    switch (variant) {
      case 'text':
        return theme.radius.sm;
      case 'circular':
        return theme.radius.full;
      case 'rectangular':
        return theme.radius.md;
    }
  };

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <View style={[styles.textContainer, style]}>
        {Array.from({ length: lines }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.skeleton,
              {
                width: index === lines - 1 ? '60%' : finalWidth, // Last line shorter
                height: finalHeight,
                borderRadius: getBorderRadius(),
                backgroundColor: shouldAnimate ? backgroundColor : theme.colors.muted,
                marginBottom: index < lines - 1 ? theme.spacing[2] : 0,
              } as Animated.WithAnimatedObject<ViewStyle>,
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: finalWidth,
          height: finalHeight,
          borderRadius: getBorderRadius(),
          backgroundColor: shouldAnimate ? backgroundColor : theme.colors.muted,
        } as Animated.WithAnimatedObject<ViewStyle>,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  textContainer: {
    width: '100%',
  },
});

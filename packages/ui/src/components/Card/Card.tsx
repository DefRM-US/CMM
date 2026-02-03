import type React from 'react';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Press handler (makes card interactive) */
  onPress?: () => void;
  /** Additional style */
  style?: ViewStyle;
  /** Accessibility label for interactive cards */
  accessibilityLabel?: string;
}

/**
 * Card container component with DefRM glass-style appearance.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <Text variant="h4">Card Title</Text>
 *   </CardHeader>
 *   <CardContent>
 *     <Text>Card content goes here</Text>
 *   </CardContent>
 *   <CardFooter>
 *     <Button onPress={handleAction}>Action</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Interactive card
 * <Card onPress={handleCardPress} accessibilityLabel="Open project details">
 *   <CardContent>
 *     <Text>Click me</Text>
 *   </CardContent>
 * </Card>
 * ```
 */
export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: CardProps): React.JSX.Element {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleHoverIn = useCallback(() => setIsHovered(true), []);
  const handleHoverOut = useCallback(() => setIsHovered(false), []);

  const cardStyles: ViewStyle = {
    backgroundColor: `${theme.colors.card}E6`,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.none,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          cardStyles,
          isHovered && styles.hovered,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, cardStyles, style]}>{children}</View>;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card header section with appropriate padding.
 */
export function CardHeader({ children, style }: CardHeaderProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[4],
          paddingBottom: theme.spacing[2],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card content section with appropriate padding.
 */
export function CardContent({ children, style }: CardContentProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.content,
        {
          padding: theme.spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Card footer section with appropriate padding.
 */
export function CardFooter({ children, style }: CardFooterProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2],
          paddingBottom: theme.spacing[4],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  hovered: {
    opacity: 0.98,
  },
  pressed: {
    opacity: 0.94,
  },
  header: {},
  content: {},
  footer: {},
});

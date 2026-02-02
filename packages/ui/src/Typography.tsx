import type React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from './theme/useTheme';

export type ThemedTextVariant = 'h1' | 'body' | 'caption' | 'label';

export interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  color?: 'foreground' | 'muted';
  children: React.ReactNode;
}

// Export directly without intermediate variable
export function ThemedText({
  variant = 'body',
  color = 'foreground',
  style,
  children,
  ...props
}: ThemedTextProps): React.JSX.Element {
  const { theme } = useTheme();
  const textColor = color === 'muted' ? theme.colors.mutedForeground : theme.colors.foreground;

  let fontSize = 16;
  let fontWeight: 'normal' | 'bold' | '500' = 'normal';

  if (variant === 'h1') {
    fontSize = 32;
    fontWeight = 'bold';
  } else if (variant === 'caption') {
    fontSize = 12;
  } else if (variant === 'label') {
    fontSize = 14;
    fontWeight = '500';
  }

  return (
    <Text
      style={[
        {
          color: textColor,
          fontSize,
          fontWeight,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

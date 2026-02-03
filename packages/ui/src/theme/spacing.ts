import type { RadiusTokens, SpacingTokens } from './types';

/**
 * Spacing tokens based on 4px grid system
 * Used for padding, margin, gap, and other spatial properties
 */
export const spacing: SpacingTokens = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

/**
 * Border radius tokens
 * DefRM uses sharp corners by default (--radius: 0rem in design system)
 * but provides options for softer appearances
 */
export const radius: RadiusTokens = {
  none: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0,
};

/**
 * Minimum touch target size for accessibility
 * All interactive elements should be at least 44x44 points
 */
export const minTouchTarget = 44;

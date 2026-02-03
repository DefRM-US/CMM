import type { ColorTokens } from './types';

/**
 * Dark theme colors - converted from OKLCH to hex
 * Based on DefRM Design System
 */
export const darkColors: ColorTokens = {
  // Core
  background: '#000000',
  foreground: '#FAFAFA',
  card: '#171717',
  cardForeground: '#FAFAFA',
  popover: '#1F1F1F',
  popoverForeground: '#FAFAFA',

  // Brand
  primary: '#EEE0CB', // Warm sand
  primaryForeground: '#000000',
  secondary: '#4B1B1F', // Deep maroon
  secondaryForeground: '#FAFAFA',

  // Neutral
  muted: '#3A2C2D',
  mutedForeground: '#B6ACA6',
  accent: '#32292A',
  accentForeground: '#FAFAFA',

  // Semantic
  destructive: '#E45C5C',
  destructiveForeground: '#FFFFFF',

  // UI
  border: '#050505',
  input: '#2B2223',
  ring: '#142D08',

  // Charts
  chart1: '#EEE0CB',
  chart2: '#4B1B1F',
  chart3: '#34D399', // Tactical emerald
  chart4: '#9CA3AF',
  chart5: '#F59E0B',

  // Sidebar
  sidebar: '#0B0B0B',
  sidebarForeground: '#FAFAFA',
  sidebarPrimary: '#EEE0CB',
  sidebarPrimaryForeground: '#000000',
  sidebarAccent: '#151010',
  sidebarAccentForeground: '#FAFAFA',
  sidebarBorder: '#050505',
  sidebarRing: '#32292A',
};

/**
 * Light theme colors - converted from OKLCH to hex
 * Based on DefRM Design System
 */
export const lightColors: ColorTokens = {
  // Core
  background: '#FFFFFF',
  foreground: '#0A0A0A',
  card: '#FFFFFF',
  cardForeground: '#0A0A0A',
  popover: '#FFFFFF',
  popoverForeground: '#0A0A0A',

  // Brand
  primary: '#204508',
  primaryForeground: '#FFFFFF',
  secondary: '#EFDFCB',
  secondaryForeground: '#0A0A0A',

  // Neutral
  muted: '#FBF3E9',
  mutedForeground: '#6B5D57',
  accent: '#EFE7DE',
  accentForeground: '#0A0A0A',

  // Semantic
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',

  // UI
  border: '#E5E5E5',
  input: '#D7CEC4',
  ring: '#204508',

  // Charts
  chart1: '#204508',
  chart2: '#6B5D57',
  chart3: '#34D399',
  chart4: '#F59E0B',
  chart5: '#EF4444',

  // Sidebar
  sidebar: '#FFFFFF',
  sidebarForeground: '#0A0A0A',
  sidebarPrimary: '#204508',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#FBF3E9',
  sidebarAccentForeground: '#0A0A0A',
  sidebarBorder: '#E5E5E5',
  sidebarRing: '#D7CEC4',
};

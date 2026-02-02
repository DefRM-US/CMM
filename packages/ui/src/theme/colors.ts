import type { ColorTokens } from './types';

/**
 * Dark theme colors - converted from OKLCH to hex
 * Based on DefRM Design System
 */
export const darkColors: ColorTokens = {
  // Core
  background: '#000000',
  foreground: '#FAFAFA',
  card: '#343434',
  cardForeground: '#FAFAFA',
  popover: '#787878',
  popoverForeground: '#FAFAFA',

  // Brand
  primary: '#E8E4C9', // Emerald-tinted cream
  primaryForeground: '#000000',
  secondary: '#5C3D2E', // Dark brown/orange
  secondaryForeground: '#F2EED4', // Light yellow

  // Neutral
  muted: '#4D4240', // Muted brown
  mutedForeground: '#A3A3A3', // Medium gray
  accent: '#463D3B', // Dark accent
  accentForeground: '#FAFAFA',

  // Semantic
  destructive: '#B8A8A5', // Red/orange tinted
  destructiveForeground: '#FFFFFF',

  // UI
  border: '#1F1F1F', // Very dark gray
  input: '#404040', // Dark gray
  ring: '#2D4A3A', // Teal focus ring

  // Charts
  chart1: '#4A2F24',
  chart2: '#6E6E6E',
  chart3: '#3D6654',
  chart4: '#E8E4C9',
  chart5: '#7A5D52',

  // Sidebar
  sidebar: '#343434',
  sidebarForeground: '#FAFAFA',
  sidebarPrimary: '#3A6B5C',
  sidebarPrimaryForeground: '#FAFAFA',
  sidebarAccent: '#454545',
  sidebarAccentForeground: '#FAFAFA',
  sidebarBorder: '#484848',
  sidebarRing: '#6E6E6E',
};

/**
 * Light theme colors - converted from OKLCH to hex
 * Based on DefRM Design System
 */
export const lightColors: ColorTokens = {
  // Core
  background: '#FFFFFF',
  foreground: '#1F1F1F',
  card: '#FFFFFF',
  cardForeground: '#1F1F1F',
  popover: '#5A4438',
  popoverForeground: '#1F1F1F',

  // Brand
  primary: '#3A6B5C', // Dark teal
  primaryForeground: '#F2EED4', // Light yellow
  secondary: '#E5E0C5', // Light green/cream
  secondaryForeground: '#000000',

  // Neutral
  muted: '#F5F2E6', // Very light green
  mutedForeground: '#171717', // Near black
  accent: '#EBEBEB', // Light gray
  accentForeground: '#343434',

  // Semantic
  destructive: '#C04B32', // Orange-red
  destructiveForeground: '#FFFFFF',

  // UI
  border: '#E5E5E5', // Light gray
  input: '#E5E5E5', // Light gray
  ring: '#D9D4B8', // Light green

  // Charts
  chart1: '#5E3A2A',
  chart2: '#C9BFBA',
  chart3: '#3A6B5C',
  chart4: '#8FB49E',
  chart5: '#FAF7E8',

  // Sidebar
  sidebar: '#FAFAFA',
  sidebarForeground: '#1F1F1F',
  sidebarPrimary: '#343434',
  sidebarPrimaryForeground: '#FAFAFA',
  sidebarAccent: '#D4CECE',
  sidebarAccentForeground: '#343434',
  sidebarBorder: '#E5E5E5',
  sidebarRing: '#B3B3B3',
};

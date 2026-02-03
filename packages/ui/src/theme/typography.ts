import type { TypographyTokens } from './types';

/**
 * Typography tokens for DefRM Design System
 *
 * Font families:
 * - sans: Geist (primary), falls back to system fonts
 * - serif: Playfair Display (editorial headings)
 * - mono: IBM Plex Mono (code, technical data)
 *
 * Note: Custom fonts must be linked in the native project.
 * Until fonts are installed, system defaults will be used.
 */
export const typography: TypographyTokens = {
  fontFamily: {
    // System font fallbacks - custom fonts need to be linked in native projects
    sans: 'Poppins', // Body
    serif: 'PlayfairDisplay-Regular', // Editorial accent
    mono: 'IBMPlexMono-Regular', // Technical
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Font family names for when custom fonts are linked
 * Use these values in react-native.config.js or Xcode project
 */
export const fontFamilyNames = {
  montserrat: {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  },
  poppins: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semibold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  playfairDisplay: {
    regular: 'PlayfairDisplay-Regular',
    medium: 'PlayfairDisplay-Medium',
    semibold: 'PlayfairDisplay-SemiBold',
    bold: 'PlayfairDisplay-Bold',
  },
  ibmPlexMono: {
    regular: 'IBMPlexMono-Regular',
    medium: 'IBMPlexMono-Medium',
    semibold: 'IBMPlexMono-SemiBold',
    bold: 'IBMPlexMono-Bold',
  },
};

export const colors = {
  // Backgrounds
  backgroundPrimary: '#F5F5F5',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#FAFAFA',
  backgroundHeader: '#D9D9D9',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnPrimary: '#FFFFFF',
  textInverse: '#000000',

  // Borders
  borderPrimary: '#E0E0E0',
  borderSecondary: '#CCCCCC',
  borderStrong: '#999999',

  // Brand/Actions
  primary: '#4472C4',
  primaryLight: '#E3F2FD',

  // Status
  error: '#D32F2F',
  errorBackground: '#FFEBEE',
  info: '#1976D2',
  infoBackground: '#E3F2FD',

  // Special
  scoreNull: '#E5E5E5',
  shadow: '#000000',
} as const;

export type ColorToken = keyof typeof colors;

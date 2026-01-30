/**
 * Style property categorization for design token enforcement
 */

export const SPACING_PROPERTIES = [
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'gap',
  'rowGap',
  'columnGap',
] as const;

export const TYPOGRAPHY_PROPERTIES = ['fontSize', 'fontWeight', 'lineHeight'] as const;

export const BORDER_RADIUS_PROPERTIES = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

export type SpacingProperty = (typeof SPACING_PROPERTIES)[number];
export type TypographyProperty = (typeof TYPOGRAPHY_PROPERTIES)[number];
export type BorderRadiusProperty = (typeof BORDER_RADIUS_PROPERTIES)[number];

export type EnforcedProperty = SpacingProperty | TypographyProperty | BorderRadiusProperty;

/**
 * Get the category of a style property
 */
export function getPropertyCategory(property: string): 'spacing' | 'typography' | 'borderRadius' | null {
  if (SPACING_PROPERTIES.includes(property as SpacingProperty)) {
    return 'spacing';
  }
  if (TYPOGRAPHY_PROPERTIES.includes(property as TypographyProperty)) {
    return 'typography';
  }
  if (BORDER_RADIUS_PROPERTIES.includes(property as BorderRadiusProperty)) {
    return 'borderRadius';
  }
  return null;
}

/**
 * Get suggested token type based on property category
 */
export function getSuggestedToken(category: 'spacing' | 'typography' | 'borderRadius', property: string): string {
  switch (category) {
    case 'spacing':
      return 'spacing.xl';
    case 'typography':
      if (property === 'fontSize') return 'fontSize.base';
      if (property === 'fontWeight') return 'fontWeight.semibold';
      if (property === 'lineHeight') return 'lineHeight.normal';
      return 'typography token';
    case 'borderRadius':
      return 'borderRadius.md';
    default:
      return 'design token';
  }
}

/**
 * Get token type name for error messages
 */
export function getTokenTypeName(category: 'spacing' | 'typography' | 'borderRadius', property: string): string {
  switch (category) {
    case 'spacing':
      return 'spacing token';
    case 'typography':
      if (property === 'fontSize') return 'fontSize token';
      if (property === 'fontWeight') return 'fontWeight token';
      if (property === 'lineHeight') return 'lineHeight token';
      return 'typography token';
    case 'borderRadius':
      return 'borderRadius token';
    default:
      return 'design token';
  }
}

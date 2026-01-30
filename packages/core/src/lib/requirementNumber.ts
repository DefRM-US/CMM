/**
 * Utility functions for hierarchical requirement numbering
 * Supports formats like "1", "1.1", "1.2.3", etc.
 */

/**
 * Validate that a requirement number follows the correct format
 * Must be numeric segments separated by dots (e.g., "1", "1.2", "1.2.3")
 * Empty string is considered valid (no number assigned)
 */
export function isValidRequirementNumber(value: string): boolean {
  if (!value) return true; // Empty is OK
  return /^\d+(\.\d+)*$/.test(value);
}

/**
 * Get the depth/level of a requirement number
 * "1" → 0 (top level)
 * "1.1" → 1 (one level deep)
 * "1.2.3" → 2 (two levels deep)
 */
export function getDepth(reqNum: string): number {
  if (!reqNum) return 0;
  return (reqNum.match(/\./g) || []).length;
}

/**
 * Compare two requirement numbers for sorting
 * Uses natural numeric comparison so "1.10" > "1.2"
 * Empty strings sort to the end
 */
export function compareRequirementNumbers(a: string, b: string): number {
  // Empty strings go to end
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

/**
 * Suggest the next requirement number based on the previous one
 * Increments the last segment: "1.2" → "1.3", "1" → "2"
 * If previous is empty, returns "1"
 */
export function suggestNextNumber(previousNumber: string): string {
  if (!previousNumber) return '1';

  const parts = previousNumber.split('.');
  const lastPart = parseInt(parts[parts.length - 1], 10);
  parts[parts.length - 1] = String(lastPart + 1);
  return parts.join('.');
}

/**
 * Indent a requirement number (make it a child of the previous row)
 * Takes the previous row's number and adds ".1" to it
 * "2" after "1" → "1.1"
 * "1.3" after "1.2" → "1.2.1"
 */
export function indentNumber(previousNumber: string): string {
  if (!previousNumber) return '1';
  return `${previousNumber}.1`;
}

/**
 * Outdent a requirement number (move up one level and increment)
 * "1.2.1" → "1.3" (remove last segment, increment new last segment)
 * "1.1" → "2" (remove last segment, increment)
 * "1" → "1" (can't outdent top level, return unchanged)
 */
export function outdentNumber(current: string): string {
  if (!current) return '1';

  const parts = current.split('.');
  if (parts.length <= 1) return current; // Can't outdent top level

  parts.pop(); // Remove last segment
  const lastPart = parseInt(parts[parts.length - 1], 10);
  parts[parts.length - 1] = String(lastPart + 1);
  return parts.join('.');
}

/**
 * Get the parent requirement number
 * "1.2.3" → "1.2"
 * "1.2" → "1"
 * "1" → "" (no parent)
 */
export function getParentNumber(reqNum: string): string {
  if (!reqNum) return '';
  const parts = reqNum.split('.');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('.');
}

/**
 * Check if one requirement number is a child of another
 * "1.2.3" is child of "1.2" and "1"
 * "1.2" is child of "1"
 */
export function isChildOf(child: string, parent: string): boolean {
  if (!child || !parent) return false;
  return child.startsWith(parent + '.');
}

/**
 * Parse a requirement number into its numeric segments
 * "1.2.3" → [1, 2, 3]
 * Returns empty array for invalid/empty numbers
 */
export function parseSegments(reqNum: string): number[] {
  if (!reqNum || !isValidRequirementNumber(reqNum)) return [];
  return reqNum.split('.').map(Number);
}

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook that returns whether reduced motion is enabled in system settings.
 * Use this to disable or simplify animations for users who prefer reduced motion.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Get initial value
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setPrefersReducedMotion(enabled);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setPrefersReducedMotion(enabled);
      },
    );

    return () => subscription.remove();
  }, []);

  return prefersReducedMotion;
}

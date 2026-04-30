// @ts-nocheck

import * as ReactNativeWeb from 'react-native-web';
import {
  type ColorSchemeName,
  Dimensions,
  StyleSheet,
  Appearance as WebAppearance,
  Platform as WebPlatform,
} from 'react-native-web';

type AppStateStatus = 'active' | 'background' | 'inactive';

const listeners = new Set<(state: AppStateStatus) => void>();

const getPlatformOs = (): 'macos' | 'windows' | 'web' => {
  if (typeof navigator === 'undefined') return 'web';
  const platform = navigator.userAgent.toLowerCase();
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('win')) return 'windows';
  return 'web';
};

const getAppState = (): AppStateStatus =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden'
    ? 'background'
    : 'active';

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const nextState = getAppState();
    listeners.forEach((listener) => {
      listener(nextState);
    });
  });
}

export const AppState = {
  get currentState(): AppStateStatus {
    return getAppState();
  },
  addEventListener(_type: 'change', listener: (state: AppStateStatus) => void) {
    listeners.add(listener);
    return {
      remove() {
        listeners.delete(listener);
      },
    };
  },
};

export const InteractionManager = {
  runAfterInteractions(task: () => void) {
    const timeout = window.setTimeout(task, 0);
    return {
      cancel() {
        window.clearTimeout(timeout);
      },
    };
  },
};

export const NativeModules = {};

export const Platform = {
  ...WebPlatform,
  OS: getPlatformOs(),
};

export const Appearance = {
  getColorScheme(): ColorSchemeName {
    return WebAppearance.getColorScheme();
  },
  addChangeListener(listener: ({ colorScheme }: { colorScheme: ColorSchemeName }) => void) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return { remove() {} };
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      listener({ colorScheme: event.matches ? 'dark' : 'light' });
    };
    mediaQuery.addEventListener('change', handleChange);
    return {
      remove() {
        mediaQuery.removeEventListener('change', handleChange);
      },
    };
  },
};

export const AccessibilityInfo = {
  async isReduceMotionEnabled(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  addEventListener(_event: 'reduceMotionChanged', listener: (enabled: boolean) => void) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return { remove() {} };
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      listener(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return {
      remove() {
        mediaQuery.removeEventListener('change', handleChange);
      },
    };
  },
};

export { Dimensions, StyleSheet };
export * from 'react-native-web';
export default ReactNativeWeb;

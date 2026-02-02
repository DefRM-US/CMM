import { useCallback, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

export interface PressableState {
  isPressed: boolean;
  isHovered: boolean;
  isFocused: boolean;
}

interface UsePressableStateOptions {
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

interface UsePressableStateReturn {
  state: PressableState;
  handlers: {
    onPress: ((event: GestureResponderEvent) => void) | undefined;
    onPressIn: (event: GestureResponderEvent) => void;
    onPressOut: (event: GestureResponderEvent) => void;
    onHoverIn: () => void;
    onHoverOut: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Hook to manage pressable component states (pressed, hovered, focused).
 * Consolidates state management and event handlers for interactive components.
 *
 * @example
 * ```tsx
 * const { state, handlers } = usePressableState({
 *   onPress: () => console.log('Pressed!'),
 *   disabled: false,
 * });
 *
 * return (
 *   <Pressable
 *     {...handlers}
 *     style={[
 *       styles.button,
 *       state.isPressed && styles.pressed,
 *       state.isHovered && styles.hovered,
 *     ]}
 *   >
 *     <Text>Button</Text>
 *   </Pressable>
 * );
 * ```
 */
export function usePressableState(options: UsePressableStateOptions = {}): UsePressableStateReturn {
  const { onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, disabled } =
    options;

  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        onPress?.(event);
      }
    },
    [disabled, onPress],
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      setIsPressed(true);
      onPressIn?.(event);
    },
    [onPressIn],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setIsPressed(false);
      onPressOut?.(event);
    },
    [onPressOut],
  );

  const handleHoverIn = useCallback(() => {
    setIsHovered(true);
    onHoverIn?.();
  }, [onHoverIn]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
    onHoverOut?.();
  }, [onHoverOut]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  return {
    state: {
      isPressed,
      isHovered,
      isFocused,
    },
    handlers: {
      onPress: disabled ? undefined : handlePress,
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      onHoverIn: handleHoverIn,
      onHoverOut: handleHoverOut,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

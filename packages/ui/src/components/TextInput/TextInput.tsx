import type React from 'react';
import { forwardRef } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type HandledKeyEvent = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type KeyEvent = {
  nativeEvent: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
  };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

export interface TextInputProps
  extends Pick<
    RNTextInputProps,
    | 'onBlur'
    | 'onFocus'
    | 'keyboardType'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'secureTextEntry'
    | 'onKeyPress'
    | 'onSubmitEditing'
    | 'returnKeyType'
    | 'blurOnSubmit'
    | 'autoFocus'
    | 'multiline'
    | 'numberOfLines'
    | 'scrollEnabled'
    | 'textAlignVertical'
    | 'onContentSizeChange'
    | 'showsVerticalScrollIndicator'
    | 'showsHorizontalScrollIndicator'
  > {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  inputStyle?: RNTextInputProps['style'];
  error?: string | undefined;
  onKeyDown?: (event: KeyEvent) => void;
  onKeyUp?: (event: KeyEvent) => void;
  keyDownEvents?: HandledKeyEvent[];
  keyUpEvents?: HandledKeyEvent[];
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    containerStyle,
    inputStyle,
    error,
    onBlur,
    onFocus,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    secureTextEntry,
    onKeyPress,
    onKeyDown,
    onKeyUp,
    onSubmitEditing,
    returnKeyType,
    blurOnSubmit,
    autoFocus,
    multiline,
    numberOfLines,
    scrollEnabled,
    textAlignVertical,
    onContentSizeChange,
    showsVerticalScrollIndicator,
    showsHorizontalScrollIndicator,
    keyDownEvents,
    keyUpEvents,
  },
  ref,
): React.JSX.Element {
  const { theme } = useTheme();
  const placeholderColor = `${theme.colors.mutedForeground}99`;
  const platformKeyProps = {
    onKeyDown,
    onKeyUp,
    keyDownEvents,
    keyUpEvents,
  } as unknown as RNTextInputProps;

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && (
        <Text style={[styles.label, { color: theme.colors.foreground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.muted,
            borderColor: theme.colors.input,
          },
          error != null && { borderColor: theme.colors.destructive },
        ]}
      >
        <RNTextInput
          ref={ref}
          {...platformKeyProps}
          style={[styles.input, { color: theme.colors.foreground }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          onBlur={onBlur}
          onFocus={onFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          onKeyPress={onKeyPress}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          autoFocus={autoFocus}
          multiline={multiline}
          numberOfLines={numberOfLines}
          scrollEnabled={scrollEnabled}
          textAlignVertical={textAlignVertical}
          onContentSizeChange={onContentSizeChange}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        />
      </View>
      {error != null && (
        <Text style={[styles.errorText, { color: theme.colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
});

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 4,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
  },
});

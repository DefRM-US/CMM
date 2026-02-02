import type React from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme/useTheme';

export interface TextInputProps
  extends Pick<
    RNTextInputProps,
    'onBlur' | 'onFocus' | 'keyboardType' | 'autoCapitalize' | 'autoCorrect' | 'secureTextEntry'
  > {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  error?: string | undefined;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  containerStyle,
  error,
  onBlur,
  onFocus,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
}: TextInputProps): React.JSX.Element {
  const { theme } = useTheme();
  const placeholderColor = `${theme.colors.mutedForeground}99`;

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && <Text style={[styles.label, { color: theme.colors.foreground }]}>{label}</Text>}
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
          style={[styles.input, { color: theme.colors.foreground }]}
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
        />
      </View>
      {error != null && (
        <Text style={[styles.errorText, { color: theme.colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
}

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

import type React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({ title, onPress, disabled = false }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0078d4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: '#106ebe',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  textDisabled: {
    color: '#666666',
  },
});

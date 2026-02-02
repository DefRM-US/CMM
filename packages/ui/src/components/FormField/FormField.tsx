import type React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { ThemedText } from '../../Typography';

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Form input element */
  children: React.ReactNode;
  /** Error message */
  error?: string;
  /** Helper text (shown when no error) */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Container style */
  style?: ViewStyle;
}

/**
 * FormField wrapper component that provides consistent label, error, and helper text layout.
 * Use this when you need to wrap a custom input or combine multiple inputs.
 *
 * For standard text inputs, prefer the TextInput component which has built-in label/error support.
 *
 * @example
 * ```tsx
 * <FormField label="Select Country" error={errors.country?.message}>
 *   <CustomSelect
 *     value={country}
 *     onChange={setCountry}
 *     options={countries}
 *   />
 * </FormField>
 *
 * <FormField label="Date Range" required>
 *   <View style={{ flexDirection: 'row', gap: 8 }}>
 *     <DatePicker value={startDate} onChange={setStartDate} />
 *     <DatePicker value={endDate} onChange={setEndDate} />
 *   </View>
 * </FormField>
 * ```
 */
export function FormField({
  label,
  children,
  error,
  helperText,
  required = false,
  style,
}: FormFieldProps): React.JSX.Element {
  const { theme } = useTheme();

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <ThemedText variant="label" style={{ marginBottom: theme.spacing[1] }}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText variant="label" style={[styles.required, { color: theme.colors.destructive }]}>
            *
          </ThemedText>
        ) : null}
      </View>

      {children}

      {helperText || error ? (
        <ThemedText
          variant="caption"
          style={[
            styles.message,
            { marginTop: theme.spacing[1] },
            hasError
              ? { color: theme.colors.destructive }
              : { color: theme.colors.mutedForeground },
          ]}
        >
          {error ?? helperText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  required: {
    marginLeft: 2,
  },
  message: {
    marginTop: 4,
  },
});

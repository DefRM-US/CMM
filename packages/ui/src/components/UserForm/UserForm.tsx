import { zodResolver } from '@hookform/resolvers/zod';
import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { useTheme } from '../../theme/useTheme';
import { Button } from '../Button/Button';
import { TextInput } from '../TextInput/TextInput';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
});

export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
}

export const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const { theme } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '' },
  });

  return (
    <View style={[styles.container, { padding: theme.spacing[5] }]}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Name"
            placeholder="Enter name"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.name?.message}
            containerStyle={{ marginBottom: theme.spacing[4] }}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Email"
            placeholder="Enter email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginBottom: theme.spacing[4] }}
          />
        )}
      />

      <Controller
        control={control}
        name="age"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Age"
            placeholder="Enter age"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() ?? ''}
            error={errors.age?.message}
            keyboardType="numeric"
            containerStyle={{ marginBottom: theme.spacing[5] }}
          />
        )}
      />

      <Button onPress={handleSubmit(onSubmit)} fullWidth>
        Submit
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});

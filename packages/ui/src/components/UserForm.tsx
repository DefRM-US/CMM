import { zodResolver } from '@hookform/resolvers/zod';
import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

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
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '' },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Enter name"
          />
        )}
      />
      {errors.name ? <Text style={styles.error}>{errors.name.message}</Text> : null}

      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

      <Text style={styles.label}>Age</Text>
      <Controller
        control={control}
        name="age"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() ?? ''}
            placeholder="Enter age"
            keyboardType="numeric"
          />
        )}
      />
      {errors.age ? <Text style={styles.error}>{errors.age.message}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Submit</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 16, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 },
  error: { color: 'red', marginTop: 4 },
  button: { backgroundColor: '#0078d4', padding: 14, borderRadius: 6, marginTop: 20 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});

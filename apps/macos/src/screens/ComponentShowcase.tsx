import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  DataTable,
  type DataTableColumn,
  Divider,
  FormField,
  Skeleton,
  TextInput,
  ThemedText,
  UserForm,
  type UserFormData,
  useTheme,
} from '@repo/ui';
import type React from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
}

const sampleData: Person[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
];

const columns: DataTableColumn<Person>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.section, { marginBottom: theme.spacing[8] }]}>
      <ThemedText variant="label" style={{ marginBottom: theme.spacing[4] }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function ColorSwatch({ name, color }: { name: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.swatch, { marginRight: theme.spacing[3], marginBottom: theme.spacing[3] }]}
    >
      <View
        style={[
          styles.swatchColor,
          {
            backgroundColor: color,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      />
      <ThemedText variant="caption" style={{ marginTop: theme.spacing[1] }}>
        {name}
      </ThemedText>
    </View>
  );
}

export function ComponentShowcase(): React.JSX.Element {
  const { theme, colorScheme, toggleColorScheme } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const handleFormSubmit = (data: UserFormData) => {
    // eslint-disable-next-line no-console
    console.log('Form submitted:', data);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { padding: theme.spacing[6] }]}
    >
      {/* Header */}
      <View style={[styles.header, { marginBottom: theme.spacing[8] }]}>
        <ThemedText variant="h1">DefRM Design System</ThemedText>
        <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing[2] }}>
          React Native Component Library
        </ThemedText>
        <View style={{ marginTop: theme.spacing[4] }}>
          <Button onPress={toggleColorScheme} variant="outline">
            {`Switch to ${colorScheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          </Button>
        </View>
      </View>

      <Divider spacing={theme.spacing[4]} />

      {/* Color Palette */}
      <Section title="Color Palette">
        <View style={styles.swatchGrid}>
          <ColorSwatch name="Background" color={theme.colors.background} />
          <ColorSwatch name="Foreground" color={theme.colors.foreground} />
          <ColorSwatch name="Primary" color={theme.colors.primary} />
          <ColorSwatch name="Secondary" color={theme.colors.secondary} />
          <ColorSwatch name="Muted" color={theme.colors.muted} />
          <ColorSwatch name="Accent" color={theme.colors.accent} />
          <ColorSwatch name="Destructive" color={theme.colors.destructive} />
          <ColorSwatch name="Border" color={theme.colors.border} />
          <ColorSwatch name="Ring" color={theme.colors.ring} />
          <ColorSwatch name="Card" color={theme.colors.card} />
        </View>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <ThemedText variant="h1">Heading 1</ThemedText>
        <ThemedText variant="body" style={{ marginTop: theme.spacing[2] }}>
          Body - Default text for content and descriptions
        </ThemedText>
        <ThemedText variant="caption" color="muted" style={{ marginTop: theme.spacing[2] }}>
          Caption - Small text for metadata and helpers
        </ThemedText>
        <ThemedText variant="label" style={{ marginTop: theme.spacing[2] }}>
          Label - Form labels and small headings
        </ThemedText>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <ThemedText variant="label" style={{ marginBottom: theme.spacing[2] }}>
          Variants
        </ThemedText>
        <View style={styles.row}>
          <Button onPress={() => {}} style={{ marginRight: theme.spacing[2] }}>
            Primary
          </Button>
          <Button onPress={() => {}} variant="secondary" style={{ marginRight: theme.spacing[2] }}>
            Secondary
          </Button>
          <Button onPress={() => {}} variant="outline" style={{ marginRight: theme.spacing[2] }}>
            Outline
          </Button>
          <Button onPress={() => {}} variant="ghost" style={{ marginRight: theme.spacing[2] }}>
            Ghost
          </Button>
          <Button onPress={() => {}} variant="destructive">
            Destructive
          </Button>
        </View>

        <ThemedText
          variant="label"
          style={{ marginTop: theme.spacing[4], marginBottom: theme.spacing[2] }}
        >
          Sizes
        </ThemedText>
        <View style={styles.row}>
          <Button onPress={() => {}} size="sm" style={{ marginRight: theme.spacing[2] }}>
            Small
          </Button>
          <Button onPress={() => {}} size="md" style={{ marginRight: theme.spacing[2] }}>
            Medium
          </Button>
          <Button onPress={() => {}} size="lg">
            Large
          </Button>
        </View>

        <ThemedText
          variant="label"
          style={{ marginTop: theme.spacing[4], marginBottom: theme.spacing[2] }}
        >
          States
        </ThemedText>
        <View style={styles.row}>
          <Button onPress={() => {}} style={{ marginRight: theme.spacing[2] }}>
            Enabled
          </Button>
          <Button onPress={() => {}} disabled>
            Disabled
          </Button>
        </View>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <View style={styles.row}>
          <Badge style={{ marginRight: theme.spacing[2] }}>Default</Badge>
          <Badge variant="primary" style={{ marginRight: theme.spacing[2] }}>
            Primary
          </Badge>
          <Badge variant="secondary" style={{ marginRight: theme.spacing[2] }}>
            Secondary
          </Badge>
          <Badge variant="destructive" style={{ marginRight: theme.spacing[2] }}>
            Destructive
          </Badge>
          <Badge variant="outline">Outline</Badge>
        </View>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <Card style={{ width: 280, marginRight: theme.spacing[4] }}>
            <CardHeader>
              <ThemedText variant="label">Card Title</ThemedText>
              <ThemedText variant="caption" color="muted">
                Card subtitle or description
              </ThemedText>
            </CardHeader>
            <CardContent>
              <ThemedText variant="body">
                This is the card content area. You can put any content here.
              </ThemedText>
            </CardContent>
            <CardFooter>
              <Button onPress={() => {}} size="sm">
                Action
              </Button>
            </CardFooter>
          </Card>

          <Card
            onPress={() => {}}
            accessibilityLabel="Interactive card example"
            style={{ width: 280 }}
          >
            <CardContent>
              <Badge variant="primary" style={{ marginBottom: theme.spacing[2] }}>
                Interactive
              </Badge>
              <ThemedText variant="label">Pressable Card</ThemedText>
              <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing[2] }}>
                Click this card to see the hover and press states.
              </ThemedText>
            </CardContent>
          </Card>
        </View>
      </Section>

      {/* Text Input */}
      <Section title="Text Input">
        <View style={{ maxWidth: 400 }}>
          <TextInput
            label="Default Input"
            placeholder="Enter some text..."
            value={inputValue}
            onChangeText={setInputValue}
            containerStyle={{ marginBottom: theme.spacing[4] }}
          />

          <TextInput
            label="With Error"
            placeholder="Invalid input"
            value="invalid@"
            error="Please enter a valid email address"
            containerStyle={{ marginBottom: theme.spacing[4] }}
          />

          <TextInput label="Read Only Input" placeholder="Cannot edit" value="Sample value" />
        </View>
      </Section>

      {/* Form Field */}
      <Section title="Form Field Wrapper">
        <View style={{ maxWidth: 400 }}>
          <FormField label="Custom Control" required helperText="Using FormField wrapper">
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.input,
                borderRadius: theme.radius.md,
                padding: theme.spacing[3],
                backgroundColor: theme.colors.muted,
              }}
            >
              <ThemedText color="muted">Custom component goes here</ThemedText>
            </View>
          </FormField>
        </View>
      </Section>

      {/* Skeleton */}
      <Section title="Skeleton Loading">
        <View style={{ maxWidth: 400 }}>
          <ThemedText variant="label" style={{ marginBottom: theme.spacing[2] }}>
            Text Skeleton
          </ThemedText>
          <Skeleton variant="text" width="80%" />
          <View style={{ marginTop: theme.spacing[2] }}>
            <Skeleton variant="text" lines={3} />
          </View>

          <ThemedText
            variant="label"
            style={{ marginTop: theme.spacing[4], marginBottom: theme.spacing[2] }}
          >
            Circular Skeleton
          </ThemedText>
          <View style={styles.row}>
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              style={{ marginRight: theme.spacing[2] }}
            />
            <Skeleton
              variant="circular"
              width={48}
              height={48}
              style={{ marginRight: theme.spacing[2] }}
            />
            <Skeleton variant="circular" width={56} height={56} />
          </View>

          <ThemedText
            variant="label"
            style={{ marginTop: theme.spacing[4], marginBottom: theme.spacing[2] }}
          >
            Rectangular Skeleton
          </ThemedText>
          <Skeleton variant="rectangular" width="100%" height={120} />
        </View>
      </Section>

      {/* Divider */}
      <Section title="Divider">
        <ThemedText variant="body" style={{ marginBottom: theme.spacing[2] }}>
          Content above divider
        </ThemedText>
        <Divider spacing={theme.spacing[2]} />
        <ThemedText variant="body" style={{ marginTop: theme.spacing[2] }}>
          Content below divider
        </ThemedText>

        <View style={[styles.row, { marginTop: theme.spacing[4], height: 40 }]}>
          <ThemedText variant="body">Left</ThemedText>
          <Divider orientation="vertical" spacing={theme.spacing[2]} />
          <ThemedText variant="body">Center</ThemedText>
          <Divider orientation="vertical" spacing={theme.spacing[2]} />
          <ThemedText variant="body">Right</ThemedText>
        </View>
      </Section>

      {/* Data Table */}
      <Section title="Data Table">
        <DataTable
          data={sampleData}
          columns={columns}
          keyExtractor={(person) => String(person.id)}
        />
      </Section>

      {/* User Form */}
      <Section title="User Form (Composite)">
        <Card style={{ maxWidth: 400 }}>
          <UserForm onSubmit={handleFormSubmit} />
        </Card>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  header: {},
  section: {},
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatch: {
    alignItems: 'center',
  },
  swatchColor: {
    width: 60,
    height: 60,
  },
});

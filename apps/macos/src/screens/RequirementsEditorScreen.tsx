import { RequirementsEditor, type RequirementRow, ThemedText, useTheme } from '@repo/ui';
import type React from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

const createInitialRow = (): RequirementRow => ({
  id: `req-${Date.now().toString(36)}`,
  text: '',
  level: 0,
});

export function RequirementsEditorScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [rows, setRows] = useState<RequirementRow[]>(() => [createInitialRow()]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { padding: theme.spacing[6] }]}
    >
      <View style={{ marginBottom: theme.spacing[6] }}>
        <ThemedText variant="h1">Capability Matrix Builder</ThemedText>
        <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing[2] }}>
          Use Tab to indent, Shift+Tab to outdent, and Enter to add a new row.
        </ThemedText>
      </View>

      <RequirementsEditor rows={rows} onRowsChange={setRows} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});

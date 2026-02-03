import { generateSpreadsheet, type SpreadsheetColumn } from '@repo/core';
import { Button, type RequirementRow, RequirementsEditor, ThemedText, useTheme } from '@repo/ui';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { NativeModules, ScrollView, StyleSheet, View } from 'react-native';

const createInitialRow = (): RequirementRow => ({
  id: `req-${Date.now().toString(36)}`,
  text: '',
  level: 0,
});

const computeNumbers = (rows: RequirementRow[]): string[] => {
  const counters: number[] = [];

  return rows.map((row) => {
    while (counters.length <= row.level) {
      counters.push(0);
    }
    counters[row.level] += 1;
    counters.splice(row.level + 1);
    return counters.join('.');
  });
};

const formatTimestamp = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}${month}${day}-${hours}${minutes}`;
};

type SavePanelModule = {
  showSavePanel: (options: {
    defaultFileName: string;
    allowedExtensions?: string[];
  }) => Promise<string | null>;
};

export function RequirementsEditorScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [rows, setRows] = useState<RequirementRow[]>(() => [createInitialRow()]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [emptyRowNumbers, setEmptyRowNumbers] = useState<string[]>([]);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const numbers = useMemo(() => computeNumbers(rows), [rows]);

  const exportColumns = useMemo<SpreadsheetColumn[]>(
    () => [
      { header: 'Number', width: 12 },
      { header: 'Requirement', width: 80 },
      { header: 'Status', width: 16 },
      { header: 'Contractor Response', width: 40 },
      { header: 'Contractor Notes', width: 40 },
    ],
    [],
  );

  const buildExportRows = useCallback(
    () => rows.map((row, index) => [numbers[index] ?? `${index + 1}`, row.text, '', '', '']),
    [numbers, rows],
  );

  const runExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const filename = `capability-matrix-${formatTimestamp(new Date())}.xlsx`;
      const saveModule = NativeModules.SavePanelModule as SavePanelModule | undefined;
      let selectedPath: string | null = null;

      if (saveModule?.showSavePanel) {
        selectedPath = await saveModule.showSavePanel({
          defaultFileName: filename,
          allowedExtensions: ['xlsx'],
        });
      } else {
        setExportError('Save dialog unavailable. Rebuild the app to enable it.');
      }

      if (!selectedPath) {
        return;
      }

      const normalizedPath = selectedPath.endsWith('.xlsx') ? selectedPath : `${selectedPath}.xlsx`;

      const filePath = await generateSpreadsheet(buildExportRows(), {
        columns: exportColumns,
        filePath: normalizedPath,
      });
      setExportPath(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export spreadsheet.';
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }, [buildExportRows, exportColumns]);

  const handleExportPress = useCallback(() => {
    setExportError(null);
    setExportPath(null);
    const emptyNumbers = rows.reduce<string[]>((acc, row, index) => {
      if (row.text.trim() === '') {
        acc.push(numbers[index] ?? `${index + 1}`);
      }
      return acc;
    }, []);

    if (emptyNumbers.length > 0) {
      setEmptyRowNumbers(emptyNumbers);
      setShowEmptyWarning(true);
      return;
    }

    setEmptyRowNumbers([]);
    setShowEmptyWarning(false);
    void runExport();
  }, [numbers, rows, runExport]);

  const handleExportAnyway = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
    void runExport();
  }, [runExport]);

  const handleCancelWarning = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
  }, []);

  const themedStyles = StyleSheet.create({
    exportSection: {
      marginBottom: theme.spacing[6],
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      marginTop: theme.spacing[2],
    },
    warningPanel: {
      marginTop: theme.spacing[3],
      padding: theme.spacing[3],
      borderWidth: 1,
      borderColor: theme.colors.destructive,
      backgroundColor: `${theme.colors.destructive}1A`,
      borderRadius: theme.radius.md,
    },
    warningTitle: {
      marginBottom: theme.spacing[1],
    },
    warningActions: {
      marginTop: theme.spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
    },
    warningActionSpacer: {
      width: theme.spacing[2],
    },
    errorText: {
      color: theme.colors.destructive,
    },
  });

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

      <View style={themedStyles.exportSection}>
        <View style={themedStyles.actionRow}>
          <Button onPress={handleExportPress} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </View>

        {showEmptyWarning && emptyRowNumbers.length > 0 ? (
          <View style={themedStyles.warningPanel}>
            <ThemedText variant="label" style={themedStyles.warningTitle}>
              Empty requirements found
            </ThemedText>
            <ThemedText variant="body" color="muted">
              Rows: {emptyRowNumbers.join(', ')}
            </ThemedText>
            <ThemedText variant="caption" color="muted" style={{ marginTop: theme.spacing[1] }}>
              Review these rows or export anyway to include them as blank entries.
            </ThemedText>
            <View style={themedStyles.warningActions}>
              <Button onPress={handleCancelWarning} variant="outline" size="sm">
                Cancel
              </Button>
              <View style={themedStyles.warningActionSpacer} />
              <Button onPress={handleExportAnyway} variant="secondary" size="sm">
                Export Anyway
              </Button>
            </View>
          </View>
        ) : null}

        {exportPath ? (
          <ThemedText variant="caption" color="muted" style={themedStyles.statusText}>
            Saved to {exportPath}
          </ThemedText>
        ) : null}

        {exportError ? (
          <ThemedText variant="caption" style={[themedStyles.statusText, themedStyles.errorText]}>
            Export failed: {exportError}
          </ThemedText>
        ) : null}
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

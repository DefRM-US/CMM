import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import RNFS from 'react-native-fs';
import { getDatabase } from '@cmm/db';
import {
  exportMatrixToExcel,
  workbookToBuffer,
  generateExportFilename,
  getCurrentDate,
  SCORE_CONFIG,
  scoreUsesLightText,
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { CapabilityMatrixWithRows } from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'Export'>;

export function ExportScreen({ route, navigation }: Props) {
  const { matrixId } = route.params;
  const [matrix, setMatrix] = useState<CapabilityMatrixWithRows | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [version, setVersion] = useState('1.0');

  useEffect(() => {
    const loadMatrix = async () => {
      try {
        const db = await getDatabase();
        const matrixWithRows = await db.getMatrixWithRows(matrixId);
        setMatrix(matrixWithRows);
        if (matrixWithRows) {
          setCompanyName(matrixWithRows.name);
        }
      } catch {
        Alert.alert('Error', 'Failed to load matrix');
      } finally {
        setIsLoading(false);
      }
    };

    loadMatrix();
  }, [matrixId]);

  const handleExport = async () => {
    if (!matrix) return;

    setIsExporting(true);
    try {
      const date = getCurrentDate();
      const filename = generateExportFilename(companyName, date);

      const workbook = await exportMatrixToExcel(matrix, {
        companyName,
        date,
        version,
      });

      const buffer = await workbookToBuffer(workbook);

      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Get save location using document picker
      // Note: On macOS, we'll save to Documents folder
      const documentsPath = RNFS.DocumentDirectoryPath;
      const filePath = `${documentsPath}/${filename}`;

      await RNFS.writeFile(filePath, base64, 'base64');

      Alert.alert('Export Complete', `File saved to:\n${filePath}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!matrix) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Matrix not found</Text>
      </View>
    );
  }

  // Calculate score summary
  const scoreCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let unratedCount = 0;
  for (const row of matrix.rows) {
    if (row.experienceAndCapability !== null) {
      scoreCounts[row.experienceAndCapability]++;
    } else {
      unratedCount++;
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Settings</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter company name..."
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Version</Text>
          <TextInput style={styles.input} value={version} onChangeText={setVersion} placeholder="1.0" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <Text style={styles.previewInfo}>
          Matrix: {matrix.name}
          {'\n'}
          Total Rows: {matrix.rows.length}
        </Text>

        <View style={styles.scoreSummary}>
          {([3, 2, 1, 0] as const).map((score) => (
            <View key={score} style={styles.scoreItem}>
              <View style={[styles.scoreBadge, { backgroundColor: SCORE_CONFIG[score].color }]}>
                <Text style={[styles.scoreBadgeText, scoreUsesLightText(score) && styles.scoreBadgeTextLight]}>
                  {score}
                </Text>
              </View>
              <Text style={styles.scoreCount}>{scoreCounts[score]}</Text>
            </View>
          ))}
          <View style={styles.scoreItem}>
            <View style={styles.unratedBadge}>
              <Text style={styles.scoreBadgeText}>-</Text>
            </View>
            <Text style={styles.scoreCount}>{unratedCount}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={handleExport} disabled={isExporting}>
        {isExporting ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.exportButtonText}>Export to Excel</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    padding: spacing.xl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  section: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.button,
    fontSize: fontSize.base,
    backgroundColor: colors.backgroundSecondary,
  },
  previewInfo: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  scoreSummary: {
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  scoreItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unratedBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.borderPrimary,
  },
  scoreBadgeText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  scoreBadgeTextLight: {
    color: colors.textOnPrimary,
  },
  scoreCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  exportButton: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  exportButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
  },
});

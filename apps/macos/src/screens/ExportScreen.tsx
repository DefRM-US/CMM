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
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { getDatabase } from '@cmm/db';
import {
  exportMatrixToExcel,
  workbookToBuffer,
  generateExportFilename,
  getCurrentDate,
  SCORE_CONFIG,
  scoreUsesLightText,
} from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { CapabilityMatrixWithRows, Score } from '@cmm/core';

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
      } catch (error) {
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
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4472C4" />
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
          <TextInput
            style={styles.input}
            value={version}
            onChangeText={setVersion}
            placeholder="1.0"
          />
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
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: SCORE_CONFIG[score].color },
                ]}
              >
                <Text
                  style={[
                    styles.scoreBadgeText,
                    scoreUsesLightText(score) && styles.scoreBadgeTextLight,
                  ]}
                >
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

      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" />
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
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  previewInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scoreSummary: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  scoreItem: {
    alignItems: 'center',
    gap: 4,
  },
  scoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unratedBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  scoreBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  scoreBadgeTextLight: {
    color: '#fff',
  },
  scoreCount: {
    fontSize: 12,
    color: '#666',
  },
  exportButton: {
    backgroundColor: '#4472C4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

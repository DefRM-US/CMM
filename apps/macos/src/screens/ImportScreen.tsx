import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { parseExcelFile, getFilenameFromPath, colors, fontSize, fontWeight, spacing, borderRadius } from '@cmm/core';
import { getDatabase } from '@cmm/db';
import { useMatrices } from '@cmm/state';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ParsedMatrix } from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'Import'>;

export function ImportScreen({ navigation }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ uri: string; name: string }>>([]);
  const [parsedMatrices, setParsedMatrices] = useState<ParsedMatrix[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { loadMatrices } = useMatrices();

  const handleSelectFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.xlsx, DocumentPicker.types.xls],
        allowMultiSelection: true,
      });

      setSelectedFiles(results.map((r) => ({ uri: r.uri, name: r.name || 'Unknown' })));
      setParsedMatrices([]);
      setParseErrors([]);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to select files');
      }
    }
  };

  const handleParseFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    const allMatrices: ParsedMatrix[] = [];
    const allErrors: string[] = [];

    try {
      for (const file of selectedFiles) {
        try {
          // Read file as base64 and convert to ArrayBuffer
          const base64 = await RNFS.readFile(file.uri, 'base64');
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;

          const result = parseExcelFile(arrayBuffer, getFilenameFromPath(file.name));
          allMatrices.push(...result.matrices);
          allErrors.push(...result.errors);
        } catch (error) {
          allErrors.push(`Failed to read ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setParsedMatrices(allMatrices);
      setParseErrors(allErrors);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedMatrices.length === 0) return;

    setIsImporting(true);
    try {
      const db = await getDatabase();

      for (const parsed of parsedMatrices) {
        // Create matrix
        const matrix = await db.createMatrix({
          name: parsed.name,
          isImported: true,
          sourceFile: parsed.sourceFile,
        });

        // Create rows
        for (let i = 0; i < parsed.rows.length; i++) {
          const row = parsed.rows[i];
          await db.createMatrixRow({
            matrixId: matrix.id,
            requirementNumber: row.requirementNumber,
            requirements: row.requirements,
            experienceAndCapability: row.experienceAndCapability,
            pastPerformance: row.pastPerformance,
            comments: row.comments,
            rowOrder: i,
          });
        }
      }

      await loadMatrices();
      Alert.alert('Import Complete', `Successfully imported ${parsedMatrices.length} matrix(es).`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const renderParsedMatrix = ({ item }: { item: ParsedMatrix }) => (
    <View style={styles.matrixPreview}>
      <Text style={styles.matrixName}>{item.name}</Text>
      <Text style={styles.matrixMeta}>
        {item.rows.length} rows • Source: {item.sourceFile}
        {item.sheetName ? ` (${item.sheetName})` : ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Step 1: Select Files */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Excel Files</Text>
        <TouchableOpacity style={styles.selectButton} onPress={handleSelectFiles}>
          <Text style={styles.selectButtonText}>Select Files</Text>
        </TouchableOpacity>
        {selectedFiles.length > 0 && (
          <View style={styles.fileList}>
            {selectedFiles.map((file, index) => (
              <Text key={index} style={styles.fileName}>
                {file.name}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Step 2: Parse Files */}
      {selectedFiles.length > 0 && parsedMatrices.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Parse Files</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleParseFiles} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Parse Files</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Warnings/Errors:</Text>
          {parseErrors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              {error}
            </Text>
          ))}
        </View>
      )}

      {/* Step 3: Preview & Import */}
      {parsedMatrices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Preview ({parsedMatrices.length} matrices found)</Text>
          <FlatList
            data={parsedMatrices}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={renderParsedMatrix}
            style={styles.previewList}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleImport} disabled={isImporting}>
            {isImporting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Import {parsedMatrices.length} Matrix(es)</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    padding: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  selectButton: {
    backgroundColor: colors.borderPrimary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  fileList: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  fileName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
  errorSection: {
    backgroundColor: colors.errorBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  previewList: {
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  matrixPreview: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  matrixName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  matrixMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useActiveMatrix } from '@cmm/state';
import { SCORE_CONFIG, scoreUsesLightText } from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { CapabilityMatrixRow, Score } from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'MatrixEditor'>;

export function MatrixEditorScreen({ route, navigation }: Props) {
  const { matrixId } = route.params;
  const { activeMatrix, isLoading, selectMatrix, addRow, updateRow, deleteRow } =
    useActiveMatrix();

  useEffect(() => {
    selectMatrix(matrixId);
  }, [matrixId, selectMatrix]);

  useEffect(() => {
    if (activeMatrix) {
      navigation.setOptions({ title: activeMatrix.name });
    }
  }, [activeMatrix, navigation]);

  const handleScoreChange = useCallback(
    (rowId: string, currentScore: Score) => {
      // Cycle through scores: null -> 0 -> 1 -> 2 -> 3 -> null
      const nextScore: Score =
        currentScore === null
          ? 0
          : currentScore === 3
            ? null
            : ((currentScore + 1) as Score);
      updateRow(rowId, { experienceAndCapability: nextScore });
    },
    [updateRow]
  );

  const renderRow = ({ item, index }: { item: CapabilityMatrixRow; index: number }) => {
    const score = item.experienceAndCapability;
    const scoreConfig = score !== null ? SCORE_CONFIG[score] : null;
    const useLightText = score !== null && scoreUsesLightText(score);

    return (
      <View style={styles.row}>
        <View style={styles.rowNumber}>
          <TextInput
            style={styles.reqNumberInput}
            value={item.requirementNumber}
            onChangeText={(text) =>
              updateRow(item.id, { requirementNumber: text })
            }
            placeholder={String(index + 1)}
          />
        </View>
        <View style={styles.rowRequirement}>
          <TextInput
            style={styles.requirementInput}
            value={item.requirements}
            onChangeText={(text) => updateRow(item.id, { requirements: text })}
            placeholder="Enter requirement..."
            multiline
          />
        </View>
        <TouchableOpacity
          style={[
            styles.rowScore,
            scoreConfig && { backgroundColor: scoreConfig.color },
          ]}
          onPress={() => handleScoreChange(item.id, score)}
        >
          <Text
            style={[
              styles.scoreText,
              useLightText && styles.scoreTextLight,
            ]}
          >
            {score !== null ? score : '-'}
          </Text>
        </TouchableOpacity>
        <View style={styles.rowPastPerformance}>
          <TextInput
            style={styles.textInput}
            value={item.pastPerformance}
            onChangeText={(text) =>
              updateRow(item.id, { pastPerformance: text })
            }
            placeholder="Past performance..."
            multiline
          />
        </View>
        <View style={styles.rowComments}>
          <TextInput
            style={styles.textInput}
            value={item.comments}
            onChangeText={(text) => updateRow(item.id, { comments: text })}
            placeholder="Comments..."
            multiline
          />
        </View>
        <TouchableOpacity
          style={styles.deleteRowButton}
          onPress={() => deleteRow(item.id)}
        >
          <Text style={styles.deleteRowText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.headerReqNumber]}>Req #</Text>
      <Text style={[styles.headerCell, styles.headerRequirement]}>
        Requirements
      </Text>
      <Text style={[styles.headerCell, styles.headerScore]}>Score</Text>
      <Text style={[styles.headerCell, styles.headerPastPerformance]}>
        Past Performance
      </Text>
      <Text style={[styles.headerCell, styles.headerComments]}>Comments</Text>
      <View style={styles.headerDelete} />
    </View>
  );

  if (isLoading || !activeMatrix) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4472C4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={addRow}>
          <Text style={styles.toolbarButtonText}>+ Add Row</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => navigation.navigate('Export', { matrixId })}
        >
          <Text style={styles.toolbarButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Score Legend */}
      <View style={styles.legend}>
        {([3, 2, 1, 0] as const).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View
              style={[styles.legendBadge, { backgroundColor: SCORE_CONFIG[s].color }]}
            >
              <Text
                style={[
                  styles.legendBadgeText,
                  scoreUsesLightText(s) && styles.legendBadgeTextLight,
                ]}
              >
                {s}
              </Text>
            </View>
            <Text style={styles.legendLabel}>{SCORE_CONFIG[s].label}</Text>
          </View>
        ))}
      </View>

      {/* Table */}
      <FlatList
        data={activeMatrix.rows}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.tableContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toolbarButton: {
    backgroundColor: '#4472C4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toolbarButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    padding: 12,
    gap: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  legendBadgeTextLight: {
    color: '#fff',
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
  tableContent: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#D9D9D9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  headerReqNumber: {
    width: 60,
  },
  headerRequirement: {
    flex: 2,
    paddingHorizontal: 8,
  },
  headerScore: {
    width: 60,
    textAlign: 'center',
  },
  headerPastPerformance: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerComments: {
    flex: 2,
    paddingHorizontal: 8,
  },
  headerDelete: {
    width: 32,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  rowNumber: {
    width: 60,
  },
  reqNumberInput: {
    fontSize: 12,
    color: '#333',
    paddingVertical: 4,
  },
  rowRequirement: {
    flex: 2,
    paddingHorizontal: 8,
  },
  requirementInput: {
    fontSize: 12,
    color: '#333',
    minHeight: 40,
  },
  rowScore: {
    width: 60,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  scoreTextLight: {
    color: '#fff',
  },
  rowPastPerformance: {
    flex: 1,
    paddingHorizontal: 8,
  },
  rowComments: {
    flex: 2,
    paddingHorizontal: 8,
  },
  textInput: {
    fontSize: 12,
    color: '#333',
    minHeight: 40,
  },
  deleteRowButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteRowText: {
    fontSize: 20,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
});

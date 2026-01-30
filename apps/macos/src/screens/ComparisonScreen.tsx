import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDatabase } from '@cmm/db';
import {
  buildComparisonData,
  SCORE_CONFIG,
  scoreUsesLightText,
} from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type {
  ComparisonData,
  CapabilityMatrixWithRows,
  Score,
} from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'Comparison'>;

export function ComparisonScreen({ route }: Props) {
  const { matrixIds } = route.params;
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMatrices = async () => {
      try {
        const db = await getDatabase();
        const matrices: CapabilityMatrixWithRows[] = [];

        for (const id of matrixIds) {
          const matrix = await db.getMatrixWithRows(id);
          if (matrix) {
            matrices.push(matrix);
          }
        }

        const data = buildComparisonData(matrices);
        setComparisonData(data);
      } catch (error) {
        console.error('Failed to load matrices for comparison:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatrices();
  }, [matrixIds]);

  const renderScoreBadge = (score: Score) => {
    if (score === null) {
      return (
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyBadgeText}>-</Text>
        </View>
      );
    }

    const config = SCORE_CONFIG[score];
    const useLightText = scoreUsesLightText(score);

    return (
      <View style={[styles.scoreBadge, { backgroundColor: config.color }]}>
        <Text
          style={[styles.scoreBadgeText, useLightText && styles.scoreBadgeTextLight]}
        >
          {score}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4472C4" />
      </View>
    );
  }

  if (!comparisonData || comparisonData.matrices.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No matrices to compare</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal>
        <View>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.requirementHeader}>
              <Text style={styles.headerText}>Requirement</Text>
            </View>
            {comparisonData.matrices.map((matrix) => (
              <View key={matrix.id} style={styles.matrixHeader}>
                <Text style={styles.headerText} numberOfLines={2}>
                  {matrix.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {comparisonData.rows.map((row, rowIndex) => (
            <View
              key={row.normalizedRequirement}
              style={[
                styles.dataRow,
                rowIndex % 2 === 1 && styles.dataRowAlt,
              ]}
            >
              <View style={styles.requirementCell}>
                <Text style={styles.requirementText} numberOfLines={3}>
                  {row.requirement}
                </Text>
              </View>
              {comparisonData.matrices.map((matrix) => {
                const cell = row.cells.get(matrix.id);
                return (
                  <View key={matrix.id} style={styles.scoreCell}>
                    {renderScoreBadge(cell?.score ?? null)}
                    {cell?.pastPerformance ? (
                      <Text style={styles.tooltipIndicator}>PP</Text>
                    ) : null}
                    {cell?.comments ? (
                      <Text style={styles.tooltipIndicator}>C</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendItems}>
          {([3, 2, 1, 0] as const).map((score) => (
            <View key={score} style={styles.legendItem}>
              <View
                style={[
                  styles.legendBadge,
                  { backgroundColor: SCORE_CONFIG[score].color },
                ]}
              >
                <Text
                  style={[
                    styles.legendBadgeText,
                    scoreUsesLightText(score) && styles.legendBadgeTextLight,
                  ]}
                >
                  {score}
                </Text>
              </View>
              <Text style={styles.legendLabel}>{SCORE_CONFIG[score].label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendIndicators}>
          <Text style={styles.legendIndicatorText}>
            PP = Has Past Performance
          </Text>
          <Text style={styles.legendIndicatorText}>C = Has Comments</Text>
        </View>
      </View>
    </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 32,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#D9D9D9',
    borderBottomWidth: 2,
    borderBottomColor: '#999',
  },
  requirementHeader: {
    width: 250,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#999',
  },
  matrixHeader: {
    width: 120,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CCC',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dataRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  requirementCell: {
    width: 250,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  requirementText: {
    fontSize: 12,
    color: '#333',
  },
  scoreCell: {
    width: 120,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    flexDirection: 'row',
    gap: 4,
  },
  scoreBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  scoreBadgeText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  scoreBadgeTextLight: {
    color: '#fff',
  },
  emptyBadgeText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#999',
  },
  tooltipIndicator: {
    fontSize: 8,
    color: '#666',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  legend: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
    fontWeight: 'bold',
    fontSize: 10,
    color: '#333',
  },
  legendBadgeTextLight: {
    color: '#fff',
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
  legendIndicators: {
    flexDirection: 'row',
    gap: 16,
  },
  legendIndicatorText: {
    fontSize: 12,
    color: '#666',
  },
});

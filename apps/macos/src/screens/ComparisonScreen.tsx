import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDatabase } from '@cmm/db';
import {
  buildComparisonData,
  SCORE_CONFIG,
  scoreUsesLightText,
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ComparisonData, CapabilityMatrixWithRows, Score } from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'Comparison'>;

export function ComparisonScreen({ route }: Props) {
  const { matrixIds } = route.params;
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
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
        <Text style={[styles.scoreBadgeText, useLightText && styles.scoreBadgeTextLight]}>{score}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <View key={row.normalizedRequirement} style={[styles.dataRow, rowIndex % 2 === 1 && styles.dataRowAlt]}>
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
                    {cell?.pastPerformance ? <Text style={styles.tooltipIndicator}>PP</Text> : null}
                    {cell?.comments ? <Text style={styles.tooltipIndicator}>C</Text> : null}
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
              <View style={[styles.legendBadge, { backgroundColor: SCORE_CONFIG[score].color }]}>
                <Text style={[styles.legendBadgeText, scoreUsesLightText(score) && styles.legendBadgeTextLight]}>
                  {score}
                </Text>
              </View>
              <Text style={styles.legendLabel}>{SCORE_CONFIG[score].label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendIndicators}>
          <Text style={styles.legendIndicatorText}>PP = Has Past Performance</Text>
          <Text style={styles.legendIndicatorText}>C = Has Comments</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
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
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundHeader,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
  },
  requirementHeader: {
    width: 250,
    padding: spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.borderStrong,
  },
  matrixHeader: {
    width: 120,
    padding: spacing.lg,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderSecondary,
  },
  headerText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  dataRowAlt: {
    backgroundColor: colors.backgroundTertiary,
  },
  requirementCell: {
    width: 250,
    padding: spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.borderPrimary,
  },
  requirementText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  scoreCell: {
    width: 120,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderPrimary,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scoreBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.borderPrimary,
  },
  scoreBadgeText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  scoreBadgeTextLight: {
    color: colors.textOnPrimary,
  },
  emptyBadgeText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  tooltipIndicator: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    backgroundColor: colors.borderPrimary,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
  },
  legend: {
    backgroundColor: colors.backgroundSecondary,
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  legendTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBadgeText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  legendBadgeTextLight: {
    color: colors.textOnPrimary,
  },
  legendLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  legendIndicators: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  legendIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

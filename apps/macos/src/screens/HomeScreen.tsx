import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMatrices } from '@cmm/state';
import { formatDate, colors, fontSize, fontWeight, spacing, borderRadius } from '@cmm/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { CapabilityMatrix } from '@cmm/core';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { matrices, isLoading, loadMatrices, createMatrix, deleteMatrix } = useMatrices();
  const [showNewMatrixInput, setShowNewMatrixInput] = useState(false);
  const [newMatrixName, setNewMatrixName] = useState('');
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  useEffect(() => {
    loadMatrices();
  }, [loadMatrices]);

  const handleCreateMatrix = async () => {
    if (!newMatrixName.trim()) return;

    const matrix = await createMatrix(newMatrixName.trim());
    if (matrix) {
      setNewMatrixName('');
      setShowNewMatrixInput(false);
      navigation.navigate('MatrixEditor', { matrixId: matrix.id });
    }
  };

  const handleDeleteMatrix = (id: string, name: string) => {
    Alert.alert('Delete Matrix', `Are you sure you want to delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMatrix(id),
      },
    ]);
  };

  const toggleComparison = (id: string) => {
    setSelectedForComparison((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCompare = () => {
    if (selectedForComparison.length >= 2) {
      navigation.navigate('Comparison', { matrixIds: selectedForComparison });
    }
  };

  const renderMatrix = ({ item }: { item: CapabilityMatrix }) => {
    const isSelected = selectedForComparison.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.matrixCard, isSelected && styles.matrixCardSelected]}
        onPress={() => navigation.navigate('MatrixEditor', { matrixId: item.id })}
        onLongPress={() => toggleComparison(item.id)}
      >
        <View style={styles.matrixInfo}>
          <Text style={styles.matrixName}>{item.name}</Text>
          <Text style={styles.matrixDate}>
            {item.isImported ? 'Imported • ' : ''}
            {formatDate(item.updatedAt)}
          </Text>
        </View>
        <View style={styles.matrixActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Export', { matrixId: item.id })}
          >
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteMatrix(item.id, item.name)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowNewMatrixInput(true)}>
          <Text style={styles.primaryButtonText}>+ New Matrix</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Import')}>
          <Text style={styles.secondaryButtonText}>Import Excel</Text>
        </TouchableOpacity>
        {selectedForComparison.length >= 2 && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleCompare}>
            <Text style={styles.primaryButtonText}>Compare ({selectedForComparison.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* New Matrix Input */}
      {showNewMatrixInput && (
        <View style={styles.newMatrixContainer}>
          <TextInput
            style={styles.input}
            placeholder="Matrix name..."
            value={newMatrixName}
            onChangeText={setNewMatrixName}
            onSubmitEditing={handleCreateMatrix}
            autoFocus
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateMatrix}>
            <Text style={styles.primaryButtonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowNewMatrixInput(false);
              setNewMatrixName('');
            }}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Matrix List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : matrices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Matrices Yet</Text>
          <Text style={styles.emptyStateText}>Create a new matrix or import from Excel to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={matrices}
          keyExtractor={(item) => item.id}
          renderItem={renderMatrix}
          contentContainerStyle={styles.list}
        />
      )}

      {selectedForComparison.length > 0 && (
        <View style={styles.selectionHint}>
          <Text style={styles.selectionHintText}>
            {selectedForComparison.length} selected for comparison (long-press to toggle)
          </Text>
          <TouchableOpacity onPress={() => setSelectedForComparison([])}>
            <Text style={styles.clearSelectionText}>Clear</Text>
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
  },
  toolbar: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.button,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.borderPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.button,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  newMatrixContainer: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  matrixCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  matrixCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  matrixInfo: {
    flex: 1,
  },
  matrixName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  matrixDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  matrixActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.borderPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: colors.errorBackground,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectionHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.infoBackground,
    gap: spacing.lg,
  },
  selectionHintText: {
    fontSize: fontSize.sm,
    color: colors.info,
  },
  clearSelectionText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: fontWeight.semibold,
  },
});

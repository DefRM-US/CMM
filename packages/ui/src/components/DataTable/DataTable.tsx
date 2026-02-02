import {
  type AccessorKeyColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../Typography';
import { useTheme } from '../../theme/useTheme';

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({ data, columns, keyExtractor }: DataTableProps<T>) {
  const { theme } = useTheme();
  const [sorting, setSorting] = useState<SortingState>([]);

  const tanstackColumns: AccessorKeyColumnDef<T, unknown>[] = columns.map((col) => ({
    accessorKey: col.key,
    header: col.header,
    enableSorting: col.sortable !== false,
  }));

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const getSortIndicator = (columnKey: string): string => {
    const sort = sorting.find((s) => s.id === columnKey);
    if (!sort) return '';
    return sort.desc ? ' ▼' : ' ▲';
  };

  const toggleSort = (columnKey: string, sortable: boolean) => {
    if (!sortable) return;

    setSorting((current) => {
      const existing = current.find((s) => s.id === columnKey);
      if (!existing) {
        return [{ id: columnKey, desc: false }];
      }
      if (!existing.desc) {
        return [{ id: columnKey, desc: true }];
      }
      return [];
    });
  };

  const getCellValue = (row: T, key: keyof T): string => {
    const value = row[key];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const themedStyles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.muted,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerCell: {
      flex: 1,
      padding: theme.spacing[3],
    },
    sortableHeader: {
      cursor: 'pointer',
    },
    headerText: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.foreground,
      fontSize: theme.typography.fontSize.sm,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowEven: {
      backgroundColor: 'transparent',
    },
    rowOdd: {
      backgroundColor: `${theme.colors.muted}40`, // 25% opacity
    },
    cell: {
      flex: 1,
      padding: theme.spacing[3],
    },
    cellText: {
      color: theme.colors.foreground,
      fontSize: theme.typography.fontSize.sm,
    },
    emptyRow: {
      padding: theme.spacing[6],
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.mutedForeground,
      fontSize: theme.typography.fontSize.sm,
    },
  });

  return (
    <View style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.headerRow}>
        {columns.map((col) => {
          const sortable = col.sortable !== false;
          return (
            <Pressable
              key={col.key}
              onPress={() => toggleSort(col.key, sortable)}
              style={[themedStyles.headerCell, sortable && themedStyles.sortableHeader]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${col.header}`}
            >
              <ThemedText style={themedStyles.headerText}>
                {col.header}
                {getSortIndicator(col.key)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Body */}
      {rows.map((row, index) => (
        <View
          key={keyExtractor(row.original)}
          style={[themedStyles.row, index % 2 === 0 ? themedStyles.rowEven : themedStyles.rowOdd]}
        >
          {columns.map((col) => (
            <View key={col.key} style={themedStyles.cell}>
              <ThemedText style={themedStyles.cellText}>
                {getCellValue(row.original, col.key)}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}

      {/* Empty state */}
      {rows.length === 0 && (
        <View style={themedStyles.emptyRow}>
          <ThemedText style={themedStyles.emptyText}>No data</ThemedText>
        </View>
      )}
    </View>
  );
}

import {
  type AccessorKeyColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type React from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../../Typography';
import { useTheme } from '../../theme/useTheme';

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  width?: number;
  renderCell?: (args: { value: T[keyof T]; row: T; columnKey: string }) => React.ReactNode;
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

  const getColumnStyle = (width?: number) => (width ? { width, flexShrink: 0 } : { flex: 1 });

  const themedStyles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: `${theme.colors.card}E6`,
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.accent,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.border,
    },
    headerCell: {
      padding: theme.spacing[3],
    },
    sortableHeader: {
      cursor: 'pointer',
    },
    headerText: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.mutedForeground,
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.mono,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      minHeight: 48,
    },
    rowEven: {
      backgroundColor: `${theme.colors.card}E6`,
    },
    rowOdd: {
      backgroundColor: `${theme.colors.muted}1A`,
    },
    cell: {
      padding: theme.spacing[3],
    },
    cellText: {
      color: theme.colors.foreground,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm + 6,
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
              style={[
                themedStyles.headerCell,
                getColumnStyle(col.width),
                sortable && themedStyles.sortableHeader,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${col.header}`}
            >
              <ThemedText style={themedStyles.headerText} numberOfLines={2} ellipsizeMode="tail">
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
            <View key={col.key} style={[themedStyles.cell, getColumnStyle(col.width)]}>
              {col.renderCell ? (
                col.renderCell({
                  value: row.original[col.key],
                  row: row.original,
                  columnKey: col.key,
                })
              ) : (
                <ThemedText style={themedStyles.cellText}>
                  {getCellValue(row.original, col.key)}
                </ThemedText>
              )}
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

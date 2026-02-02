import {
  type AccessorKeyColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    return sort.desc ? ' v' : ' ^';
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {columns.map((col) => {
          const sortable = col.sortable !== false;
          return (
            <Pressable
              key={col.key}
              onPress={() => toggleSort(col.key, sortable)}
              style={[styles.headerCell, sortable && styles.sortableHeader]}
            >
              <Text style={styles.headerText}>
                {col.header}
                {getSortIndicator(col.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Body */}
      {rows.map((row) => (
        <View key={keyExtractor(row.original)} style={styles.row}>
          {columns.map((col) => (
            <View key={col.key} style={styles.cell}>
              <Text style={styles.cellText}>{getCellValue(row.original, col.key)}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Empty state */}
      {rows.length === 0 && (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>No data</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  headerCell: {
    flex: 1,
    padding: 12,
  },
  sortableHeader: {
    cursor: 'pointer',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#000000',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  cell: {
    flex: 1,
    padding: 12,
  },
  cellText: {
    color: '#333333',
    fontSize: 14,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
  },
});

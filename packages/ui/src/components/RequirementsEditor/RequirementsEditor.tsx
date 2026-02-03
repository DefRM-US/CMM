import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TextInput as RNTextInput, ViewStyle } from 'react-native';
import { StyleSheet, TextInput as RNTextInputComponent, View } from 'react-native';

import { ThemedText } from '../../Typography';
import { minTouchTarget } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../Button';
import type { HandledKeyEvent, KeyEvent } from '../TextInput';

export interface RequirementRow {
  id: string;
  text: string;
  level: number;
}

export interface RequirementsEditorProps {
  rows: RequirementRow[];
  onRowsChange: (rows: RequirementRow[]) => void;
  style?: ViewStyle;
  placeholder?: string;
}

const computeNumbers = (rows: RequirementRow[]): string[] => {
  const counters: number[] = [];

  return rows.map((row) => {
    while (counters.length <= row.level) {
      counters.push(0);
    }
    counters[row.level] += 1;
    counters.splice(row.level + 1);
    return counters.join('.');
  });
};

const getSubtreeEndIndex = (rows: RequirementRow[], index: number): number => {
  const baseLevel = rows[index]?.level ?? 0;
  let end = index;

  for (let i = index + 1; i < rows.length; i += 1) {
    if (rows[i].level <= baseLevel) {
      break;
    }
    end = i;
  }

  return end;
};

export function RequirementsEditor({
  rows,
  onRowsChange,
  style,
  placeholder = 'Write a requirement...',
}: RequirementsEditorProps): React.JSX.Element {
  const { theme } = useTheme();
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const idCounter = useRef(0);
  const inputRefs = useRef(new Map<string, RNTextInput | null>());

  const numbers = useMemo(() => computeNumbers(rows), [rows]);

  const createRow = useCallback(
    (level: number): RequirementRow => ({
      id: `req-${Date.now().toString(36)}-${idCounter.current++}`,
      text: '',
      level,
    }),
    [],
  );

  const setInputRef = useCallback(
    (id: string) => (ref: RNTextInput | null) => {
      if (ref) {
        inputRefs.current.set(id, ref);
      } else {
        inputRefs.current.delete(id);
      }
    },
    [],
  );

  const focusRow = useCallback((id: string) => {
    const target = inputRefs.current.get(id);
    if (target?.focus) {
      target.focus();
    }
  }, []);


  const updateRowText = useCallback(
    (index: number, text: string) => {
      const updated = rows.map((row, idx) => (idx === index ? { ...row, text } : row));
      onRowsChange(updated);
    },
    [rows, onRowsChange],
  );

  const shiftSubtreeLevels = useCallback(
    (index: number, delta: number) => {
      if (delta === 0) return;
      const endIndex = getSubtreeEndIndex(rows, index);
      const updated = rows.map((row, idx) => {
        if (idx < index || idx > endIndex) {
          return row;
        }
        return { ...row, level: Math.max(0, row.level + delta) };
      });
      onRowsChange(updated);
    },
    [rows, onRowsChange],
  );

  const indentRow = useCallback(
    (index: number) => {
      if (index === 0) return;
      const current = rows[index];
      if (!current) return;

      const previousLevel = rows[index - 1]?.level ?? 0;
      const maxLevel = previousLevel + 1;
      const nextLevel = Math.min(current.level + 1, maxLevel);
      const delta = nextLevel - current.level;

      if (delta === 0) return;
      shiftSubtreeLevels(index, delta);
    },
    [rows, shiftSubtreeLevels],
  );

  const outdentRow = useCallback(
    (index: number) => {
      const current = rows[index];
      if (!current || current.level === 0) return;

      const nextLevel = Math.max(0, current.level - 1);
      const delta = nextLevel - current.level;

      if (delta === 0) return;
      shiftSubtreeLevels(index, delta);
    },
    [rows, shiftSubtreeLevels],
  );

  const insertRowAfter = useCallback(
    (index: number) => {
      const baseLevel = rows[index]?.level ?? 0;
      const newRow = createRow(baseLevel);
      const updated = [...rows.slice(0, index + 1), newRow, ...rows.slice(index + 1)];
      onRowsChange(updated);
      setPendingFocusId(newRow.id);
    },
    [rows, onRowsChange, createRow],
  );

  const handleAddRow = useCallback(() => {
    if (rows.length === 0) {
      const newRow = createRow(0);
      onRowsChange([newRow]);
      setPendingFocusId(newRow.id);
      return;
    }

    if (activeRowId) {
      const index = rows.findIndex((row) => row.id === activeRowId);
      if (index !== -1) {
        insertRowAfter(index);
        return;
      }
    }

    const baseLevel = rows[rows.length - 1]?.level ?? 0;
    const newRow = createRow(baseLevel);
    onRowsChange([...rows, newRow]);
    setPendingFocusId(newRow.id);
  }, [rows, activeRowId, createRow, insertRowAfter, onRowsChange]);

  const handledKeyEvents = useMemo<HandledKeyEvent[]>(
    () => [
      { key: 'Tab' },
      { key: 'Tab', shiftKey: true },
      { key: 'Enter' },
      { key: 'Return' },
    ],
    [],
  );

  const handleKeyDown = useCallback(
    (index: number) => (event: KeyEvent | NativeSyntheticEvent<{ key: string; shiftKey?: boolean }>) => {
      const key = event.nativeEvent.key;
      if (key !== 'Tab' && key !== 'Enter' && key !== 'Return') return;

      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }

      if (key === 'Tab') {
        const shiftKey = (event.nativeEvent as { shiftKey?: boolean }).shiftKey ?? false;
        if (shiftKey) {
          outdentRow(index);
        } else {
          indentRow(index);
        }

        const currentId = rows[index]?.id;
        if (currentId) {
          setPendingFocusId(currentId);
          setActiveRowId(currentId);
        }
        return;
      }

      insertRowAfter(index);
    },
    [indentRow, insertRowAfter, outdentRow, rows],
  );

  const handleSubmitEditing = useCallback(
    (index: number) => {
      insertRowAfter(index);
    },
    [insertRowAfter],
  );

  useEffect(() => {
    if (!pendingFocusId) return;
    const timeout = setTimeout(() => {
      if (rows.some((row) => row.id === pendingFocusId)) {
        focusRow(pendingFocusId);
        setPendingFocusId(null);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [pendingFocusId, rows, focusRow]);

  const themedStyles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: `${theme.colors.border}CC`,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.colors.muted}E6`,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: theme.spacing[1],
    },
    headerCell: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
    },
    numberHeader: {
      width: 84,
    },
    row: {
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.border}CC`,
    },
    rowEven: {
      backgroundColor: 'transparent',
    },
    rowOdd: {
      backgroundColor: `${theme.colors.muted}2E`,
    },
    rowActive: {
      backgroundColor: `${theme.colors.accent}33`,
    },
    rowContent: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: theme.spacing[2],
      paddingRight: theme.spacing[3],
    },
    numberCell: {
      width: 84,
      justifyContent: 'center',
      paddingLeft: theme.spacing[3],
    },
    numberText: {
      fontWeight: theme.typography.fontWeight.semibold,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.foreground,
      fontFamily: theme.typography.fontFamily.mono,
    },
    inputCell: {
      flex: 1,
    },
    inputWrapper: {
      minHeight: minTouchTarget,
      borderWidth: 1,
      borderColor: theme.colors.input,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.muted}B3`,
      paddingHorizontal: theme.spacing[3],
      justifyContent: 'center',
    },
    inputWrapperActive: {
      borderColor: theme.colors.ring,
      backgroundColor: `${theme.colors.accent}66`,
    },
    inputText: {
      color: theme.colors.foreground,
      fontSize: theme.typography.fontSize.base,
      lineHeight: Math.round(
        theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      ),
      paddingVertical: Math.max(
        0,
        Math.floor(
          (minTouchTarget -
            Math.round(
              theme.typography.fontSize.base * theme.typography.lineHeight.normal,
            )) /
            2,
        ),
      ),
    },
    actions: {
      marginTop: theme.spacing[3],
      alignSelf: 'flex-start',
    },
    headerLabel: {
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

  const indentUnit = theme.spacing[4];

  return (
    <View style={style}>
      <View style={themedStyles.container}>
        <View style={themedStyles.headerRow}>
          <View style={[themedStyles.headerCell, themedStyles.numberHeader]}>
            <ThemedText variant="label" style={themedStyles.headerLabel}>
              No.
            </ThemedText>
          </View>
          <View style={themedStyles.headerCell}>
            <ThemedText variant="label" style={themedStyles.headerLabel}>
              Requirement
            </ThemedText>
          </View>
        </View>

        {rows.map((row, index) => {
          const indentPadding = theme.spacing[3] + row.level * indentUnit;
          const isActive = activeRowId === row.id;
          return (
            <View
              key={row.id}
              style={[
                themedStyles.row,
                index % 2 === 0 ? themedStyles.rowEven : themedStyles.rowOdd,
                isActive && themedStyles.rowActive,
              ]}
            >
              <View style={[themedStyles.rowContent, { paddingLeft: indentPadding }]}>
                <View style={themedStyles.numberCell}>
                  <ThemedText style={themedStyles.numberText}>{numbers[index]}</ThemedText>
                </View>
                <View style={themedStyles.inputCell}>
                  <View
                    style={[
                      themedStyles.inputWrapper,
                      isActive && themedStyles.inputWrapperActive,
                    ]}
                  >
                    <RNTextInputComponent
                      ref={setInputRef(row.id)}
                      value={row.text}
                      onChangeText={(text) => updateRowText(index, text)}
                      placeholder={placeholder}
                      placeholderTextColor={`${theme.colors.mutedForeground}99`}
                      onFocus={() => setActiveRowId(row.id)}
                      enableFocusRing={false}
                      keyDownEvents={handledKeyEvents}
                      onKeyDown={handleKeyDown(index)}
                      onSubmitEditing={() => handleSubmitEditing(index)}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      multiline
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      style={themedStyles.inputText}
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={themedStyles.actions}>
        <Button onPress={handleAddRow} variant="outline" size="sm">
          Add Row
        </Button>
      </View>
    </View>
  );
}

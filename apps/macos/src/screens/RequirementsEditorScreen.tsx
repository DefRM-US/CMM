import {
  type CapabilityImportRecord,
  type CapabilityImportRowRecord,
  createProject,
  generateCapabilityMatrixSpreadsheet,
  initDatabase,
  listCapabilityImportRows,
  listCapabilityImports,
  listProjects,
  loadProjectRequirements,
  type ParsedCapabilityMatrixRow,
  type ProjectRecord,
  parseCapabilityMatrixSpreadsheet,
  type StoredRequirementRow,
  saveCapabilityImportWithRows,
  saveProjectRequirements,
  seedSampleProjects,
  touchProject,
} from '@repo/core';
import {
  Button,
  DataTable,
  type RequirementRow,
  RequirementsEditor,
  TextInput,
  ThemedText,
  useTheme,
} from '@repo/ui';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  InteractionManager,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const createInitialRow = (): RequirementRow => ({
  id: `req-${Date.now().toString(36)}`,
  text: '',
  level: 0,
});

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

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getFilename = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
};

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, '');

const formatTimestamp = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}${month}${day}-${hours}${minutes}`;
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type EditedLabelInfo = {
  label: string;
  nextRefreshAt: Date | null;
};

const parseSqliteTimestamp = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6] ?? '0');
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isSameLocalDate = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const nextMinuteBoundary = (now: Date): Date => {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return next;
};

const nextHourBoundary = (now: Date): Date => {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
};

const nextMidnight = (now: Date): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

const nextMonthBoundary = (now: Date): Date => new Date(now.getFullYear(), now.getMonth() + 1, 1);

const isPreviousCalendarMonth = (date: Date, now: Date): boolean => {
  let prevMonth = now.getMonth() - 1;
  let prevYear = now.getFullYear();
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  return date.getFullYear() === prevYear && date.getMonth() === prevMonth;
};

const formatAbsoluteDate = (date: Date, now: Date): string => {
  const monthLabel = MONTH_LABELS[date.getMonth()] ?? 'Jan';
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return `${monthLabel} ${day}`;
  }
  return `${monthLabel} ${day}, ${date.getFullYear()}`;
};

const getEditedLabelInfo = (timestamp?: string | null, now: Date = new Date()): EditedLabelInfo => {
  const date = parseSqliteTimestamp(timestamp);
  if (!date) {
    return { label: 'just now', nextRefreshAt: null };
  }

  const msPerMinute = 60 * 1000;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;
  const diffMs = Math.max(0, now.getTime() - date.getTime());

  if (diffMs < msPerMinute) {
    return { label: 'just now', nextRefreshAt: nextMinuteBoundary(now) };
  }

  const minutes = Math.floor(diffMs / msPerMinute);
  if (minutes < 60) {
    return {
      label: minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`,
      nextRefreshAt: nextMinuteBoundary(now),
    };
  }

  const hours = Math.floor(diffMs / msPerHour);
  if (hours < 24) {
    return {
      label: hours === 1 ? '1 hour ago' : `${hours} hours ago`,
      nextRefreshAt: nextHourBoundary(now),
    };
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDate(date, yesterday)) {
    return { label: 'yesterday', nextRefreshAt: nextMidnight(now) };
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / msPerDay);

  if (diffDays < 7) {
    return {
      label: diffDays === 1 ? '1 day ago' : `${diffDays} days ago`,
      nextRefreshAt: nextMidnight(now),
    };
  }

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    diffDays <= 27
  ) {
    return { label: 'Earlier this month', nextRefreshAt: nextMonthBoundary(now) };
  }

  if (isPreviousCalendarMonth(date, now) && diffDays <= 59) {
    return { label: 'Last month', nextRefreshAt: nextMonthBoundary(now) };
  }

  return { label: formatAbsoluteDate(date, now), nextRefreshAt: null };
};

const formatEditedLabel = (timestamp?: string | null, now: Date = new Date()): string =>
  getEditedLabelInfo(timestamp, now).label;

const getNextRefreshDelayMs = (projects: ProjectRecord[], now: Date): number => {
  let nextRefreshMs: number | null = null;
  projects.forEach((project) => {
    const timestamp = project.updatedAt ?? project.lastOpenedAt ?? null;
    const { nextRefreshAt } = getEditedLabelInfo(timestamp, now);
    if (!nextRefreshAt) return;
    const nextAtMs = nextRefreshAt.getTime();
    if (nextRefreshMs === null || nextAtMs < nextRefreshMs) {
      nextRefreshMs = nextAtMs;
    }
  });

  if (nextRefreshMs === null) return Number.POSITIVE_INFINITY;
  const delay = nextRefreshMs - now.getTime();
  if (delay <= 0) return 1000;
  return Math.min(delay, 2147483647);
};

type SavePanelModule = {
  showSavePanel: (options: {
    defaultFileName: string;
    allowedExtensions?: string[];
  }) => Promise<string | null>;
};

type OpenPanelModule = {
  showOpenPanel: (options: {
    allowedExtensions?: string[];
    allowsMultipleSelection?: boolean;
  }) => Promise<string[] | null>;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type MatrixTab = 'base' | 'responses';

type PendingImport = {
  id: string;
  filePath: string;
  filename: string;
  companyName: string;
  sheetTitle: string;
  rows: ParsedCapabilityMatrixRow[];
};

type ImportReviewReason = 'missing' | 'text_mismatch';

type ImportReviewItem = {
  id: string;
  importId: string;
  rowIndex: number;
  number: string;
  text: string;
  reason: ImportReviewReason;
  mappedNumber: string;
  ignored: boolean;
};

export function RequirementsEditorScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const isMac = Platform.OS === 'macos';
  const [rows, setRows] = useState<RequirementRow[]>(() => [createInitialRow()]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSeedingSamples, setIsSeedingSamples] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [emptyRowNumbers, setEmptyRowNumbers] = useState<string[]>([]);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTitle, setExportTitle] = useState('');
  const [legend3, setLegend3] = useState('');
  const [legend2, setLegend2] = useState('');
  const [legend1, setLegend1] = useState('');
  const [legend0, setLegend0] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImports, setPendingImports] = useState<PendingImport[]>([]);
  const [reviewItems, setReviewItems] = useState<ImportReviewItem[]>([]);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [capabilityImports, setCapabilityImports] = useState<CapabilityImportRecord[]>([]);
  const [capabilityImportRows, setCapabilityImportRows] = useState<
    Record<string, CapabilityImportRowRecord[]>
  >({});

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestIdRef = useRef(0);
  const pendingSaveRef = useRef<{ projectId: string; rows: RequirementRow[] } | null>(null);
  const lastSavedSnapshotRef = useRef<{ projectId: string; signature: string } | null>(null);
  const isScrollingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relativeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [relativeTick, setRelativeTick] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState ?? 'active');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const numbers = useMemo(() => computeNumbers(rows), [rows]);
  const importSeedRef = useRef(0);
  const tabPreferenceRef = useRef(false);
  const [activeTab, setActiveTab] = useState<MatrixTab>('base');

  const requirementIndex = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id,
        number: numbers[index] ?? `${index + 1}`,
        text: row.text.trim(),
      })),
    [numbers, rows],
  );

  const requirementByNumber = useMemo(() => {
    const map = new Map<string, { id: string; number: string; text: string }>();
    requirementIndex.forEach((req) => {
      map.set(req.number, req);
    });
    return map;
  }, [requirementIndex]);

  const hasImportedResponses = capabilityImports.length > 0;
  const responseCountLabel = `${capabilityImports.length} compan${
    capabilityImports.length === 1 ? 'y' : 'ies'
  }`;

  const buildExportRows = useCallback(
    () =>
      rows.map((row, index) => ({
        number: numbers[index] ?? `${index + 1}`,
        text: row.text,
        score: 0 as const,
        pastPerformance: '',
        comments: '',
      })),
    [numbers, rows],
  );

  const buildDefaultLegend = useCallback((projectName?: string | null) => {
    const trimmed = projectName?.trim();
    const label = trimmed && trimmed.length > 0 ? trimmed : 'this SOW';
    return {
      title: trimmed ? `${trimmed} - Capability Matrix` : 'Capability Matrix',
      score3: `Excellent capability - significant experience and past performance inputs; applicable to ${label}`,
      score2:
        `Good capability - significant experience and past performance inputs; ` +
        `applicable to ${label} and executed on other than ${label} programs but on related platforms`,
      score1: 'Some capability - minor or scattered experience',
      score0: 'No capability',
    };
  }, []);

  const openExportModal = useCallback(() => {
    const defaults = buildDefaultLegend(selectedProject?.name);
    setExportTitle(defaults.title);
    setLegend3(defaults.score3);
    setLegend2(defaults.score2);
    setLegend1(defaults.score1);
    setLegend0(defaults.score0);
    setShowExportModal(true);
  }, [buildDefaultLegend, selectedProject?.name]);

  const mapRowsForSave = useCallback(
    (rowsToSave: RequirementRow[]): StoredRequirementRow[] =>
      rowsToSave.map((row, index) => ({
        id: row.id,
        text: row.text,
        level: row.level,
        position: index,
      })),
    [],
  );

  const buildRowsSignature = useCallback(
    (rowsToSave: RequirementRow[]): string =>
      JSON.stringify(
        rowsToSave.map((row, index) => ({
          id: row.id,
          text: row.text,
          level: row.level,
          position: index,
        })),
      ),
    [],
  );

  const hasUnsavedChanges = useCallback(
    (projectId: string, rowsToSave: RequirementRow[]) => {
      const lastSnapshot = lastSavedSnapshotRef.current;
      if (!lastSnapshot || lastSnapshot.projectId !== projectId) {
        return true;
      }
      return lastSnapshot.signature !== buildRowsSignature(rowsToSave);
    },
    [buildRowsSignature],
  );

  const markRowsSaved = useCallback(
    (projectId: string, rowsToSave: RequirementRow[]) => {
      lastSavedSnapshotRef.current = {
        projectId,
        signature: buildRowsSignature(rowsToSave),
      };
    },
    [buildRowsSignature],
  );

  const resetExportState = useCallback(() => {
    setExportError(null);
    setExportPath(null);
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
  }, []);

  const persistRows = useCallback(
    async (projectId: string, rowsToSave: RequirementRow[]) => {
      try {
        if (!hasUnsavedChanges(projectId, rowsToSave)) {
          setSaveStatus('saved');
          setSaveError(null);
          return;
        }
        setSaveStatus('saving');
        setSaveError(null);
        await saveProjectRequirements(projectId, mapRowsForSave(rowsToSave));
        markRowsSaved(projectId, rowsToSave);
        const updatedProjects = await listProjects();
        setProjects(updatedProjects);
        setSaveStatus('saved');
        setSaveError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save changes.';
        setSaveStatus('error');
        setSaveError(message);
      }
    },
    [hasUnsavedChanges, mapRowsForSave, markRowsSaved],
  );

  const loadCapabilityResponses = useCallback(async (projectId: string) => {
    setResponsesError(null);
    try {
      const imports = await listCapabilityImports(projectId);
      const rowsByImport: Record<string, CapabilityImportRowRecord[]> = {};
      for (const entry of imports) {
        rowsByImport[entry.id] = await listCapabilityImportRows(entry.id);
      }
      setCapabilityImports(imports);
      setCapabilityImportRows(rowsByImport);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load responses.';
      setResponsesError(message);
    }
  }, []);

  const flushPendingSave = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    void persistRows(pending.projectId, pending.rows);
  }, [persistRows]);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      setIsBooting(true);
      setDbError(null);
      try {
        await initDatabase();
        const projectList = await listProjects();
        if (!isMounted) return;
        setProjects(projectList);
        setSelectedProjectId(projectList[0]?.id ?? null);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load database.';
        setDbError(message);
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    };

    void boot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (relativeRefreshTimeoutRef.current) {
      clearTimeout(relativeRefreshTimeoutRef.current);
      relativeRefreshTimeoutRef.current = null;
    }

    if (appState !== 'active') {
      return;
    }

    const now = new Date(Math.max(Date.now(), relativeTick));
    const delay = getNextRefreshDelayMs(projects, now);
    if (!Number.isFinite(delay) || delay === Number.POSITIVE_INFINITY) {
      return;
    }

    relativeRefreshTimeoutRef.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        setRelativeTick(Date.now());
      });
    }, delay);

    return () => {
      if (relativeRefreshTimeoutRef.current) {
        clearTimeout(relativeRefreshTimeoutRef.current);
        relativeRefreshTimeoutRef.current = null;
      }
    };
  }, [appState, projects, relativeTick]);

  useEffect(() => {
    if (!selectedProjectId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setIsHydrating(false);
      setSaveStatus('idle');
      setRows([createInitialRow()]);
      return;
    }

    let isActive = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsHydrating(true);
    setSaveStatus('idle');
    setSaveError(null);
    resetExportState();
    setImportError(null);
    setImportStatus(null);
    setShowImportModal(false);
    setPendingImports([]);
    setReviewItems([]);
    setResponsesError(null);
    setCapabilityImports([]);
    setCapabilityImportRows({});

    const load = async () => {
      try {
        const loadedRows = await loadProjectRequirements(selectedProjectId);
        if (!isActive) return;
        const hydratedRows =
          loadedRows.length > 0
            ? loadedRows.map((row) => ({
                id: row.id,
                text: row.text,
                level: row.level,
              }))
            : [createInitialRow()];
        setRows(hydratedRows);
        markRowsSaved(selectedProjectId, hydratedRows);

        await touchProject(selectedProjectId);
        const updatedProjects = await listProjects();
        if (isActive) {
          setProjects(updatedProjects);
        }

        if (isActive) {
          await loadCapabilityResponses(selectedProjectId);
        }
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to load project.';
        setSaveStatus('error');
        setSaveError(message);
      } finally {
        if (isActive) {
          setIsHydrating(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [loadCapabilityResponses, markRowsSaved, resetExportState, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || isHydrating) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const projectId = selectedProjectId;
    const rowsSnapshot = rows;
    saveRequestIdRef.current += 1;
    const requestId = saveRequestIdRef.current;

    if (!hasUnsavedChanges(projectId, rowsSnapshot)) {
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        if (saveRequestIdRef.current !== requestId) return;
        if (isScrollingRef.current) {
          pendingSaveRef.current = { projectId, rows: rowsSnapshot };
          return;
        }
        void persistRows(projectId, rowsSnapshot);
      });
    }, 900);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, isHydrating, persistRows, rows, selectedProjectId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      if (relativeRefreshTimeoutRef.current) {
        clearTimeout(relativeRefreshTimeoutRef.current);
      }
    };
  }, []);

  const runExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const filenameBase = selectedProject?.name
        ? `capability-matrix-${selectedProject.name.replace(/\s+/g, '-').toLowerCase()}`
        : 'capability-matrix';
      const filename = `${filenameBase}-${formatTimestamp(new Date())}.xlsx`;
      const saveModule = (NativeModules as { SavePanelModule?: SavePanelModule }).SavePanelModule;
      let selectedPath: string | null = null;

      if (saveModule?.showSavePanel) {
        selectedPath = await saveModule.showSavePanel({
          defaultFileName: filename,
          allowedExtensions: ['xlsx'],
        });
      } else {
        setExportError('Save dialog unavailable. Rebuild the app to enable it.');
      }

      if (!selectedPath) {
        return;
      }

      const normalizedPath = selectedPath.endsWith('.xlsx') ? selectedPath : `${selectedPath}.xlsx`;

      const filePath = await generateCapabilityMatrixSpreadsheet({
        title: exportTitle.trim() || selectedProject?.name || 'Capability Matrix',
        legend: {
          3:
            legend3.trim() ||
            'Excellent capability - significant experience and past performance inputs.',
          2:
            legend2.trim() ||
            'Good capability - significant experience and past performance inputs.',
          1: legend1.trim() || 'Some capability - minor or scattered experience',
          0: legend0.trim() || 'No capability',
        },
        rows: buildExportRows(),
        filePath: normalizedPath,
      });
      setExportPath(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export spreadsheet.';
      setExportError(message);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  }, [buildExportRows, exportTitle, legend0, legend1, legend2, legend3, selectedProject?.name]);

  const handleExportPress = useCallback(() => {
    setExportError(null);
    setExportPath(null);

    if (!selectedProjectId) {
      setExportError('Create or select a project to export.');
      return;
    }

    const emptyNumbers = rows.reduce<string[]>((acc, row, index) => {
      if (row.text.trim() === '') {
        acc.push(numbers[index] ?? `${index + 1}`);
      }
      return acc;
    }, []);

    if (emptyNumbers.length > 0) {
      setEmptyRowNumbers(emptyNumbers);
      setShowEmptyWarning(true);
      return;
    }

    setEmptyRowNumbers([]);
    setShowEmptyWarning(false);
    openExportModal();
  }, [numbers, openExportModal, rows, selectedProjectId]);

  const handleExportAnyway = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
    openExportModal();
  }, [openExportModal]);

  const handleCancelWarning = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  const handleConfirmExport = useCallback(() => {
    if (isExporting) return;
    void runExport();
  }, [isExporting, runExport]);

  const createPendingImportId = useCallback(() => {
    importSeedRef.current += 1;
    return `pending-${Date.now().toString(36)}-${importSeedRef.current.toString(36)}`;
  }, []);

  const buildReviewItems = useCallback(
    (importId: string, rowsToReview: ParsedCapabilityMatrixRow[]): ImportReviewItem[] => {
      const items: ImportReviewItem[] = [];
      rowsToReview.forEach((row, index) => {
        const number = row.number.trim();
        const text = row.text.trim();
        const requirement = requirementByNumber.get(number);

        if (!requirement) {
          items.push({
            id: `${importId}-${index}`,
            importId,
            rowIndex: index,
            number,
            text,
            reason: 'missing',
            mappedNumber: '',
            ignored: false,
          });
          return;
        }

        if (normalizeText(requirement.text) !== normalizeText(text)) {
          items.push({
            id: `${importId}-${index}`,
            importId,
            rowIndex: index,
            number,
            text,
            reason: 'text_mismatch',
            mappedNumber: requirement.number,
            ignored: false,
          });
        }
      });
      return items;
    },
    [requirementByNumber],
  );

  const handleImportPress = useCallback(async () => {
    setImportError(null);
    setImportStatus(null);

    if (!selectedProjectId) {
      setImportError('Create or select a project to import responses.');
      return;
    }

    setIsImporting(true);
    try {
      const openModule = (NativeModules as { OpenPanelModule?: OpenPanelModule }).OpenPanelModule;
      if (!openModule?.showOpenPanel) {
        setImportError('Open dialog unavailable. Rebuild the app to enable it.');
        return;
      }

      const selectedPaths = await openModule.showOpenPanel({
        allowedExtensions: ['xlsx'],
        allowsMultipleSelection: true,
      });

      if (!selectedPaths || selectedPaths.length === 0) {
        return;
      }

      const parsedImports: PendingImport[] = [];
      const reviewQueue: ImportReviewItem[] = [];

      for (const filePath of selectedPaths) {
        const filename = getFilename(filePath);
        const parsed = await parseCapabilityMatrixSpreadsheet(filePath);
        const companyName = stripExtension(filename).trim() || filename;
        const importId = createPendingImportId();

        parsedImports.push({
          id: importId,
          filePath,
          filename,
          companyName,
          sheetTitle: parsed.title,
          rows: parsed.rows,
        });

        reviewQueue.push(...buildReviewItems(importId, parsed.rows));
      }

      setPendingImports(parsedImports);
      setReviewItems(reviewQueue);
      setShowImportModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import spreadsheet.';
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  }, [buildReviewItems, createPendingImportId, selectedProjectId]);

  const updatePendingCompanyName = useCallback((importId: string, nextName: string) => {
    setPendingImports((current) =>
      current.map((entry) => (entry.id === importId ? { ...entry, companyName: nextName } : entry)),
    );
  }, []);

  const updateReviewItem = useCallback((itemId: string, nextValue: string) => {
    setReviewItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, mappedNumber: nextValue } : item)),
    );
  }, []);

  const toggleReviewIgnore = useCallback((itemId: string) => {
    setReviewItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ignored: !item.ignored } : item)),
    );
  }, []);

  const reviewFlags = useMemo(() => {
    const missing = new Set<string>();
    const invalid = new Set<string>();
    const duplicateIds = new Set<string>();
    const mappingByImport = new Map<string, Map<string, string[]>>();

    reviewItems.forEach((item) => {
      if (item.ignored) {
        return;
      }
      const mapped = item.mappedNumber.trim();
      if (!mapped) {
        missing.add(item.id);
        return;
      }
      if (!requirementByNumber.has(mapped)) {
        invalid.add(item.id);
        return;
      }
      const perImport = mappingByImport.get(item.importId) ?? new Map<string, string[]>();
      const list = perImport.get(mapped) ?? [];
      list.push(item.id);
      perImport.set(mapped, list);
      mappingByImport.set(item.importId, perImport);
    });

    mappingByImport.forEach((map) => {
      map.forEach((ids) => {
        if (ids.length > 1) {
          ids.forEach((id) => {
            duplicateIds.add(id);
          });
        }
      });
    });

    return {
      missing,
      invalid,
      duplicateIds,
    };
  }, [requirementByNumber, reviewItems]);

  const invalidCompanyIds = useMemo(() => {
    const invalid = new Set<string>();
    pendingImports.forEach((entry) => {
      if (!entry.companyName.trim()) {
        invalid.add(entry.id);
      }
    });
    return invalid;
  }, [pendingImports]);

  const pendingImportById = useMemo(() => {
    const map = new Map<string, PendingImport>();
    pendingImports.forEach((entry) => {
      map.set(entry.id, entry);
    });
    return map;
  }, [pendingImports]);

  const reviewHintMessage = useMemo(() => {
    if (invalidCompanyIds.size > 0) {
      return 'Provide a company name for each file.';
    }
    return 'Blank or invalid mappings will be ignored on import.';
  }, [invalidCompanyIds.size]);

  const importDisabled =
    isApplyingImport || pendingImports.length === 0 || invalidCompanyIds.size > 0;

  useEffect(() => {
    if (!selectedProjectId) return;
    if (!hasImportedResponses) {
      setActiveTab('base');
      return;
    }
    if (!tabPreferenceRef.current) {
      setActiveTab('responses');
    }
  }, [hasImportedResponses, selectedProjectId]);

  const handleTabPress = useCallback((tab: MatrixTab) => {
    tabPreferenceRef.current = true;
    setActiveTab(tab);
  }, []);

  const handleCloseImportModal = useCallback(() => {
    if (isApplyingImport) return;
    setShowImportModal(false);
    setPendingImports([]);
    setReviewItems([]);
  }, [isApplyingImport]);

  const handleConfirmImport = useCallback(async () => {
    if (!selectedProjectId || isApplyingImport) return;
    if (invalidCompanyIds.size > 0) return;

    setIsApplyingImport(true);
    setImportError(null);

    try {
      const reviewByImport = new Map<string, Map<number, ImportReviewItem>>();
      reviewItems.forEach((item) => {
        const map = reviewByImport.get(item.importId) ?? new Map<number, ImportReviewItem>();
        map.set(item.rowIndex, item);
        reviewByImport.set(item.importId, map);
      });

      for (const pending of pendingImports) {
        const perImportReview = reviewByImport.get(pending.id) ?? new Map();
        const usedRequirementIds = new Set<string>();
        const rowsToSave = pending.rows.flatMap((row, index) => {
          const review = perImportReview.get(index);
          if (review?.ignored) {
            return [];
          }
          const mappedNumber = review ? review.mappedNumber.trim() : row.number.trim();
          if (!mappedNumber) {
            return [];
          }
          const requirement = requirementByNumber.get(mappedNumber);
          if (!requirement) {
            return [];
          }
          if (usedRequirementIds.has(requirement.id)) {
            return [];
          }
          usedRequirementIds.add(requirement.id);
          return [
            {
              requirementId: requirement.id,
              requirementNumber: requirement.number,
              requirementText: requirement.text,
              score: row.score ?? null,
              pastPerformance: row.pastPerformance || null,
              comments: row.comments || null,
            },
          ];
        });

        await saveCapabilityImportWithRows({
          projectId: selectedProjectId,
          companyName: pending.companyName.trim(),
          sourceFilename: pending.filename,
          rows: rowsToSave,
        });
      }

      setImportStatus(
        `Imported ${pendingImports.length} response${pendingImports.length === 1 ? '' : 's'}.`,
      );
      setPendingImports([]);
      setReviewItems([]);
      setShowImportModal(false);
      await loadCapabilityResponses(selectedProjectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save imported responses.';
      setImportError(message);
    } finally {
      setIsApplyingImport(false);
    }
  }, [
    invalidCompanyIds.size,
    isApplyingImport,
    loadCapabilityResponses,
    pendingImports,
    requirementByNumber,
    reviewItems,
    selectedProjectId,
  ]);

  const modalKeyEvents = useMemo(
    () => [{ key: 'Escape' }, { key: 'Enter' }, { key: 'Return' }],
    [],
  );

  const handleModalKeyDown = useCallback(
    (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
      const key = event.nativeEvent.key;
      if (key === 'Escape') {
        event.preventDefault?.();
        handleCloseExportModal();
        return;
      }
      if (key === 'Enter' || key === 'Return') {
        event.preventDefault?.();
        handleConfirmExport();
      }
    },
    [handleCloseExportModal, handleConfirmExport],
  );

  const handleStartProjectCreate = useCallback(() => {
    setIsCreatingProject(true);
    setProjectError(null);
  }, []);

  const handleCancelProjectCreate = useCallback(() => {
    setIsCreatingProject(false);
    setProjectError(null);
    setNewProjectName('');
  }, []);

  const handleCreateProject = useCallback(async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      setProjectError('Project name is required.');
      return;
    }

    setIsCreating(true);
    setProjectError(null);

    try {
      const created = await createProject(trimmedName);
      const updatedProjects = await listProjects();
      setProjects(updatedProjects);
      setSelectedProjectId(created.id);
      setIsCreatingProject(false);
      setNewProjectName('');
      resetExportState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project.';
      setProjectError(message);
    } finally {
      setIsCreating(false);
    }
  }, [newProjectName, resetExportState]);

  const handleSeedSampleData = useCallback(() => {
    if (isSeedingSamples) return;
    setSeedError(null);
    setIsSeedingSamples(true);

    InteractionManager.runAfterInteractions(() => {
      const runSeed = async () => {
        try {
          const inserted = await seedSampleProjects('compact');
          const updatedProjects = await listProjects();
          setProjects(updatedProjects);
          if (inserted === 0) {
            setSeedError('Sample data already loaded.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load sample data.';
          setSeedError(message);
        } finally {
          setIsSeedingSamples(false);
        }
      };

      void runSeed();
    });
  }, [isSeedingSamples]);

  const handleSelectProject = useCallback(
    async (projectId: string) => {
      if (projectId === selectedProjectId) return;
      tabPreferenceRef.current = false;
      if (saveTimeoutRef.current && selectedProjectId && !isHydrating) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        await persistRows(selectedProjectId, rows);
      }
      pendingSaveRef.current = null;
      setSelectedProjectId(projectId);
    },
    [isHydrating, persistRows, rows, selectedProjectId],
  );

  const handleMainScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }
    scrollEndTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      flushPendingSave();
    }, 160);
  }, [flushPendingSave]);

  const saveStatusLabel = useMemo(() => {
    if (!selectedProjectId) return 'No project selected';
    if (saveStatus === 'saving') return 'Saving';
    if (saveStatus === 'saved') return 'Saved';
    if (saveStatus === 'error') return 'Save failed';
    return 'Autosave';
  }, [saveStatus, selectedProjectId]);

  type MatrixRow = { id: string; number: string; text: string } & Record<string, string>;

  const formatResponseCell = useCallback((row: CapabilityImportRowRecord): string => {
    const lines: string[] = [];
    const scoreLabel = row.score === null || row.score === undefined ? '' : String(row.score);
    lines.push(`Score: ${scoreLabel}`);
    if (row.pastPerformance && row.pastPerformance.trim().length > 0) {
      lines.push(`Past: ${row.pastPerformance.trim()}`);
    }
    if (row.comments && row.comments.trim().length > 0) {
      lines.push(`Comments: ${row.comments.trim()}`);
    }
    return lines.join('\n');
  }, []);

  const matrixData = useMemo<MatrixRow[]>(() => {
    const rowsByRequirement = new Map<string, MatrixRow>();
    const companyKeys = capabilityImports.map((entry) => `company_${entry.id}`);

    const baseRows = requirementIndex.map((req) => {
      const base: MatrixRow = { id: req.id, number: req.number, text: req.text };
      companyKeys.forEach((key) => {
        base[key] = '';
      });
      rowsByRequirement.set(req.id, base);
      return base;
    });

    capabilityImports.forEach((entry) => {
      const key = `company_${entry.id}`;
      const rows = capabilityImportRows[entry.id] ?? [];
      rows.forEach((row) => {
        if (!row.requirementId) return;
        const target = rowsByRequirement.get(row.requirementId);
        if (!target) return;
        target[key] = formatResponseCell(row);
      });
    });

    return baseRows;
  }, [capabilityImportRows, capabilityImports, formatResponseCell, requirementIndex]);

  const matrixColumns = useMemo(() => {
    const columns = [
      { key: 'number', header: 'Number', sortable: true, width: 110 },
      { key: 'text', header: 'Requirement', sortable: true, width: 360 },
    ];
    const companyColumns = capabilityImports.map((entry) => ({
      key: `company_${entry.id}`,
      header: entry.companyName,
      sortable: false,
      width: 260,
    }));
    return [...columns, ...companyColumns];
  }, [capabilityImports]);

  const gridRows = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);
  const gridColumns = useMemo(() => Array.from({ length: 7 }, (_, index) => index), []);
  const scanlines = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);

  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: isMac ? 'transparent' : theme.colors.background,
        },
        glassTint: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isMac ? `${theme.colors.background}B3` : 'transparent',
        },
        backgroundLayer: {
          ...StyleSheet.absoluteFillObject,
          overflow: 'hidden',
        },
        gridOverlay: {
          ...StyleSheet.absoluteFillObject,
          opacity: 0.35,
        },
        gridLineHorizontal: {
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: `${theme.colors.muted}55`,
        },
        gridLineVertical: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: `${theme.colors.muted}55`,
        },
        scanlineOverlay: {
          ...StyleSheet.absoluteFillObject,
          opacity: 0.12,
        },
        scanline: {
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: `${theme.colors.primary}1A`,
        },
        layout: {
          flex: 1,
          flexDirection: 'row',
        },
        sidebar: {
          width: 264,
          backgroundColor: isMac ? `${theme.colors.sidebar}66` : theme.colors.sidebar,
          borderRightWidth: 1,
          borderColor: theme.colors.sidebarBorder,
          paddingHorizontal: theme.spacing[5],
          paddingVertical: theme.spacing[6],
        },
        sidebarHeader: {
          marginBottom: theme.spacing[5],
        },
        sidebarEyebrow: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: theme.colors.sidebarForeground,
          opacity: 0.6,
        },
        sidebarTitle: {
          marginTop: theme.spacing[2],
          fontFamily: 'Montserrat-Bold',
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.sidebarForeground,
        },
        sidebarCaption: {
          marginTop: theme.spacing[2],
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.sidebarForeground,
          opacity: 0.7,
        },
        projectList: {
          flexGrow: 1,
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[6],
        },
        projectItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing[3],
          paddingHorizontal: theme.spacing[3],
          borderRadius: theme.radius.none,
          marginBottom: theme.spacing[1],
        },
        projectIndicator: {
          width: 4,
          height: 24,
          borderRadius: 0,
          backgroundColor: 'rgba(0,0,0,0)',
          marginRight: theme.spacing[2],
        },
        projectIndicatorActive: {
          backgroundColor: theme.colors.sidebarPrimary,
        },
        projectContent: {
          flex: 1,
        },
        projectItemActive: {
          backgroundColor: theme.colors.sidebarAccent,
        },
        projectItemText: {
          color: theme.colors.sidebarForeground,
          fontWeight: theme.typography.fontWeight.medium,
        },
        projectItemTextActive: {
          color: theme.colors.sidebarAccentForeground,
        },
        projectMeta: {
          marginTop: 2,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.sidebarForeground,
          opacity: 0.6,
        },
        newProjectSection: {
          paddingTop: theme.spacing[4],
          borderTopWidth: 1,
          borderColor: theme.colors.sidebarBorder,
        },
        newProjectActions: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: theme.spacing[3],
        },
        newProjectSpacer: {
          width: theme.spacing[2],
        },
        seedButton: {
          marginTop: theme.spacing[2],
        },
        seedStatus: {
          marginTop: theme.spacing[2],
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.sidebarForeground,
          opacity: 0.6,
        },
        main: {
          flex: 1,
        },
        mainContent: {
          paddingHorizontal: theme.spacing[3],
          paddingTop: theme.spacing[5],
          paddingBottom: theme.spacing[10],
          width: '100%',
          alignItems: 'stretch',
        },
        headerCard: {
          width: '100%',
          padding: theme.spacing[5],
          borderWidth: 1,
          borderRadius: theme.radius.none,
          backgroundColor: `${theme.colors.card}CC`,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing[5],
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        headerTitles: {
          flex: 1,
        },
        headerEyebrow: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: theme.colors.mutedForeground,
        },
        headerTitle: {
          marginTop: theme.spacing[2],
          fontFamily: 'Montserrat-Bold',
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.foreground,
        },
        headerActions: {
          alignItems: 'flex-end',
          marginLeft: theme.spacing[4],
        },
        statusPill: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.none,
          paddingVertical: 6,
          paddingHorizontal: theme.spacing[2],
          backgroundColor: `${theme.colors.card}CC`,
        },
        statusDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          marginRight: theme.spacing[1],
          backgroundColor: theme.colors.chart3,
        },
        statusText: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        headerHint: {
          marginTop: theme.spacing[3],
          maxWidth: 520,
          color: theme.colors.mutedForeground,
        },
        noticePanel: {
          marginTop: theme.spacing[4],
          padding: theme.spacing[4],
          borderRadius: theme.radius.none,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.card}E6`,
        },
        warningPanel: {
          marginTop: theme.spacing[3],
          padding: theme.spacing[3],
          borderWidth: 1,
          borderColor: theme.colors.destructive,
          backgroundColor: `${theme.colors.destructive}12`,
          borderRadius: theme.radius.none,
        },
        warningTitle: {
          marginBottom: theme.spacing[1],
        },
        warningActions: {
          marginTop: theme.spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
        },
        warningActionSpacer: {
          width: theme.spacing[2],
        },
        errorText: {
          color: theme.colors.destructive,
        },
        exportStatus: {
          marginTop: theme.spacing[2],
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        importStatus: {
          marginTop: theme.spacing[2],
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        editorPanel: {
          width: '100%',
          borderRadius: theme.radius.none,
          padding: theme.spacing[4],
          backgroundColor: `${theme.colors.card}E6`,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        panelTitle: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.sm,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: theme.colors.mutedForeground,
        },
        panelSubtitle: {
          marginTop: theme.spacing[1],
          color: theme.colors.mutedForeground,
        },
        panelDivider: {
          height: 1,
          backgroundColor: theme.colors.border,
          marginTop: theme.spacing[3],
          marginBottom: theme.spacing[3],
        },
        responsesPanel: {
          width: '100%',
          borderRadius: theme.radius.none,
          padding: theme.spacing[4],
          backgroundColor: `${theme.colors.card}E6`,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginTop: theme.spacing[5],
        },
        responsesHeader: {
          marginBottom: theme.spacing[3],
        },
        responsesMetaRow: {
          marginTop: theme.spacing[2],
          flexDirection: 'row',
          alignItems: 'center',
        },
        responsesTable: {
          width: '100%',
        },
        tabRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: theme.spacing[4],
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.muted}B3`,
        },
        tabButton: {
          flex: 1,
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
          alignItems: 'center',
        },
        tabButtonActive: {
          backgroundColor: theme.colors.primary,
        },
        tabDivider: {
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.border,
        },
        tabText: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.mutedForeground,
        },
        tabTextActive: {
          color: theme.colors.primaryForeground,
        },
        tabLabelRow: {
          marginTop: theme.spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        tabLabel: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: theme.colors.mutedForeground,
        },
        infoPill: {
          paddingVertical: 4,
          paddingHorizontal: theme.spacing[2],
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.accent}CC`,
        },
        infoPillText: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        emptyState: {
          width: '100%',
          padding: theme.spacing[6],
          borderRadius: theme.radius.none,
          backgroundColor: `${theme.colors.card}E6`,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        modalBackdrop: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[6],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        },
        modalScrim: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.45)',
          zIndex: 0,
        },
        modalCard: {
          width: '100%',
          maxWidth: 980,
          maxHeight: 720,
          borderWidth: 1,
          borderRadius: theme.radius.none,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          padding: theme.spacing[5],
          zIndex: 1,
        },
        modalScroll: {
          maxHeight: 520,
        },
        modalTitle: {
          fontFamily: 'Montserrat-Bold',
        },
        modalSubtitle: {
          marginTop: theme.spacing[1],
        },
        modalFields: {
          marginTop: theme.spacing[4],
        },
        modalField: {
          marginBottom: theme.spacing[3],
        },
        modalSection: {
          marginTop: theme.spacing[4],
        },
        modalSectionTitle: {
          marginBottom: theme.spacing[2],
        },
        importCard: {
          padding: theme.spacing[3],
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.card}E6`,
          marginBottom: theme.spacing[3],
        },
        importFilename: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        reviewTable: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.card}E6`,
        },
        reviewHeaderRow: {
          flexDirection: 'row',
          backgroundColor: theme.colors.accent,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        reviewHeaderCell: {
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
        },
        reviewHeaderText: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        },
        reviewRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        reviewRowEven: {
          backgroundColor: `${theme.colors.card}E6`,
        },
        reviewRowOdd: {
          backgroundColor: `${theme.colors.muted}12`,
        },
        reviewCell: {
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
          justifyContent: 'center',
        },
        reviewCellText: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.foreground,
        },
        reviewCellMuted: {
          marginTop: 2,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
          fontFamily: theme.typography.fontFamily.mono,
        },
        reviewCellInputWrapper: {
          marginBottom: 0,
        },
        reviewCellInput: {
          minHeight: 36,
          paddingVertical: 6,
          fontSize: theme.typography.fontSize.sm,
        },
        reviewPill: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingVertical: 6,
          paddingHorizontal: theme.spacing[2],
          alignItems: 'center',
        },
        reviewPillActive: {
          backgroundColor: theme.colors.secondary,
          borderColor: theme.colors.secondary,
        },
        reviewPillText: {
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        reviewPillTextActive: {
          color: theme.colors.secondaryForeground,
        },
        reviewEmpty: {
          padding: theme.spacing[4],
          alignItems: 'center',
        },
        reviewHint: {
          marginTop: theme.spacing[3],
          fontFamily: theme.typography.fontFamily.mono,
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.mutedForeground,
        },
        reviewHintWarning: {
          color: theme.colors.destructive,
        },
        modalActions: {
          marginTop: theme.spacing[4],
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        modalActionSpacer: {
          width: theme.spacing[2],
        },
      }),
    [isMac, theme],
  );

  const backgroundOverlay = useMemo(
    () => (
      <View pointerEvents="none" style={themedStyles.backgroundLayer}>
        <View style={themedStyles.gridOverlay}>
          {gridRows.map((row) => (
            <View
              key={`h-${row}`}
              style={[themedStyles.gridLineHorizontal, { top: 60 + row * 80 }]}
            />
          ))}
          {gridColumns.map((col) => (
            <View
              key={`v-${col}`}
              style={[themedStyles.gridLineVertical, { left: 40 + col * 120 }]}
            />
          ))}
        </View>
        <View style={themedStyles.scanlineOverlay}>
          {scanlines.map((line) => (
            <View key={`s-${line}`} style={[themedStyles.scanline, { top: 20 + line * 24 }]} />
          ))}
        </View>
      </View>
    ),
    [gridColumns, gridRows, scanlines, themedStyles],
  );

  const now = new Date();

  return (
    <View style={themedStyles.root}>
      <View pointerEvents="none" style={themedStyles.glassTint} />
      {backgroundOverlay}

      <View
        style={themedStyles.layout}
        pointerEvents={showExportModal || showImportModal ? 'none' : 'auto'}
      >
        <View style={themedStyles.sidebar}>
          <View style={themedStyles.sidebarHeader}>
            <ThemedText style={themedStyles.sidebarEyebrow}>Projects</ThemedText>
            <ThemedText style={themedStyles.sidebarTitle}>Capability Matrix</ThemedText>
            <ThemedText style={themedStyles.sidebarCaption}>
              Build matrices, export, and merge responses.
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={themedStyles.projectList}
            showsVerticalScrollIndicator={false}
          >
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;
              return (
                <Pressable
                  key={project.id}
                  onPress={() => void handleSelectProject(project.id)}
                  style={[themedStyles.projectItem, isActive && themedStyles.projectItemActive]}
                >
                  <View
                    style={[
                      themedStyles.projectIndicator,
                      isActive && themedStyles.projectIndicatorActive,
                    ]}
                  />
                  <View style={themedStyles.projectContent}>
                    <ThemedText
                      variant="label"
                      style={[
                        themedStyles.projectItemText,
                        isActive && themedStyles.projectItemTextActive,
                      ]}
                    >
                      {project.name}
                    </ThemedText>
                    <ThemedText style={themedStyles.projectMeta}>
                      Edited {formatEditedLabel(project.updatedAt ?? project.lastOpenedAt, now)}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={themedStyles.newProjectSection}>
            {isCreatingProject ? (
              <>
                <TextInput
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="Project name"
                  error={projectError ?? undefined}
                  onSubmitEditing={handleCreateProject}
                />
                <View style={themedStyles.newProjectActions}>
                  <Button onPress={handleCreateProject} size="sm" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  <View style={themedStyles.newProjectSpacer} />
                  <Button onPress={handleCancelProjectCreate} variant="outline" size="sm">
                    Cancel
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Button onPress={handleStartProjectCreate} variant="ghost" size="sm" fullWidth>
                  New Project
                </Button>
                <View style={themedStyles.seedButton}>
                  <Button
                    onPress={handleSeedSampleData}
                    variant="outline"
                    size="sm"
                    fullWidth
                    disabled={isSeedingSamples}
                  >
                    {isSeedingSamples ? 'Loading Samples...' : 'Load Sample Data'}
                  </Button>
                </View>
                {seedError ? (
                  <ThemedText style={themedStyles.seedStatus}>{seedError}</ThemedText>
                ) : null}
              </>
            )}
          </View>
        </View>

        <ScrollView
          style={themedStyles.main}
          contentContainerStyle={themedStyles.mainContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleMainScroll}
          scrollEventThrottle={32}
        >
          {dbError ? (
            <View style={themedStyles.emptyState}>
              <ThemedText variant="h1">Database error</ThemedText>
              <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing[2] }}>
                {dbError}
              </ThemedText>
            </View>
          ) : null}

          {!dbError && !selectedProject ? (
            <View style={themedStyles.emptyState}>
              <ThemedText variant="h1">Create your first project</ThemedText>
              <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing[2] }}>
                Use the sidebar to add a project. Your requirements auto-save as you work.
              </ThemedText>
              {isBooting ? (
                <ThemedText variant="caption" color="muted" style={{ marginTop: theme.spacing[3] }}>
                  Loading your workspace...
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          {!dbError && selectedProject ? (
            <>
              <View style={themedStyles.headerCard}>
                <View style={themedStyles.headerRow}>
                  <View style={themedStyles.headerTitles}>
                    <ThemedText style={themedStyles.headerEyebrow}>Capability Matrix</ThemedText>
                    <ThemedText variant="h1" style={themedStyles.headerTitle}>
                      {selectedProject.name}
                    </ThemedText>
                  </View>
                  <View style={themedStyles.headerActions}>
                    <View style={themedStyles.statusPill}>
                      <View style={themedStyles.statusDot} />
                      <ThemedText style={themedStyles.statusText}>{saveStatusLabel}</ThemedText>
                    </View>
                    <View style={{ marginTop: theme.spacing[2] }}>
                      <Button onPress={handleExportPress} disabled={isExporting}>
                        {isExporting ? 'Exporting...' : 'Export to Excel'}
                      </Button>
                    </View>
                    <View style={{ marginTop: theme.spacing[2] }}>
                      <Button onPress={handleImportPress} variant="outline" disabled={isImporting}>
                        {isImporting ? 'Importing...' : 'Import Responses'}
                      </Button>
                    </View>
                  </View>
                </View>

                <ThemedText variant="body" style={themedStyles.headerHint}>
                  Use Tab to indent, Shift+Tab to outdent, and Enter to add a new row.
                </ThemedText>

                {hasImportedResponses ? (
                  <View style={themedStyles.tabLabelRow}>
                    <ThemedText style={themedStyles.tabLabel}>View</ThemedText>
                    <View style={themedStyles.infoPill}>
                      <ThemedText style={themedStyles.infoPillText}>
                        {responseCountLabel}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}

                {hasImportedResponses ? (
                  <View style={themedStyles.tabRow}>
                    <Pressable
                      style={[
                        themedStyles.tabButton,
                        activeTab === 'base' && themedStyles.tabButtonActive,
                      ]}
                      onPress={() => handleTabPress('base')}
                    >
                      <ThemedText
                        style={[
                          themedStyles.tabText,
                          activeTab === 'base' && themedStyles.tabTextActive,
                        ]}
                      >
                        Base Matrix
                      </ThemedText>
                    </Pressable>
                    <View style={themedStyles.tabDivider} />
                    <Pressable
                      style={[
                        themedStyles.tabButton,
                        activeTab === 'responses' && themedStyles.tabButtonActive,
                      ]}
                      onPress={() => handleTabPress('responses')}
                    >
                      <ThemedText
                        style={[
                          themedStyles.tabText,
                          activeTab === 'responses' && themedStyles.tabTextActive,
                        ]}
                      >
                        Imported Responses
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}

                {saveStatus === 'error' && saveError ? (
                  <ThemedText style={[themedStyles.exportStatus, themedStyles.errorText]}>
                    {saveError}
                  </ThemedText>
                ) : null}

                {(exportPath || exportError || showEmptyWarning || importError || importStatus) && (
                  <View style={themedStyles.noticePanel}>
                    {showEmptyWarning && emptyRowNumbers.length > 0 ? (
                      <View style={themedStyles.warningPanel}>
                        <ThemedText variant="label" style={themedStyles.warningTitle}>
                          Empty requirements found
                        </ThemedText>
                        <ThemedText variant="body" color="muted">
                          Rows: {emptyRowNumbers.join(', ')}
                        </ThemedText>
                        <ThemedText
                          variant="caption"
                          color="muted"
                          style={{ marginTop: theme.spacing[1] }}
                        >
                          Review these rows or export anyway to include them as blank entries.
                        </ThemedText>
                        <View style={themedStyles.warningActions}>
                          <Button onPress={handleCancelWarning} variant="outline" size="sm">
                            Cancel
                          </Button>
                          <View style={themedStyles.warningActionSpacer} />
                          <Button onPress={handleExportAnyway} variant="secondary" size="sm">
                            Export Anyway
                          </Button>
                        </View>
                      </View>
                    ) : null}

                    {exportPath ? (
                      <ThemedText variant="caption" style={themedStyles.exportStatus}>
                        Saved to {exportPath}
                      </ThemedText>
                    ) : null}

                    {exportError ? (
                      <ThemedText
                        variant="caption"
                        style={[themedStyles.exportStatus, themedStyles.errorText]}
                      >
                        Export failed: {exportError}
                      </ThemedText>
                    ) : null}

                    {importStatus ? (
                      <ThemedText variant="caption" style={themedStyles.importStatus}>
                        {importStatus}
                      </ThemedText>
                    ) : null}

                    {importError ? (
                      <ThemedText
                        variant="caption"
                        style={[themedStyles.importStatus, themedStyles.errorText]}
                      >
                        Import failed: {importError}
                      </ThemedText>
                    ) : null}
                  </View>
                )}
              </View>

              {activeTab === 'base' ? (
                <View style={themedStyles.editorPanel}>
                  <ThemedText style={themedStyles.panelTitle}>Base Matrix</ThemedText>
                  <ThemedText variant="caption" style={themedStyles.panelSubtitle}>
                    Define the capability requirements that vendors will answer.
                  </ThemedText>
                  <View style={themedStyles.panelDivider} />
                  <RequirementsEditor rows={rows} onRowsChange={setRows} />
                </View>
              ) : null}

              {activeTab === 'responses' ? (
                <View style={themedStyles.responsesPanel}>
                  <View style={themedStyles.responsesHeader}>
                    <ThemedText variant="h1">Responses</ThemedText>
                    <ThemedText
                      variant="body"
                      color="muted"
                      style={{ marginTop: theme.spacing[1] }}
                    >
                      Compare imported responses across companies.
                    </ThemedText>
                    <View style={themedStyles.responsesMetaRow}>
                      <View style={themedStyles.infoPill}>
                        <ThemedText style={themedStyles.infoPillText}>
                          {responseCountLabel}
                        </ThemedText>
                      </View>
                    </View>
                    {responsesError ? (
                      <ThemedText
                        variant="caption"
                        style={[themedStyles.importStatus, themedStyles.errorText]}
                      >
                        {responsesError}
                      </ThemedText>
                    ) : null}
                    {capabilityImports.length === 0 ? (
                      <ThemedText variant="caption" color="muted" style={{ marginTop: 4 }}>
                        No responses imported yet.
                      </ThemedText>
                    ) : null}
                  </View>
                  <ScrollView horizontal style={themedStyles.responsesTable}>
                    <DataTable
                      data={matrixData}
                      columns={matrixColumns}
                      keyExtractor={(item) => item.id}
                    />
                  </ScrollView>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
      {showExportModal ? (
        <View style={themedStyles.modalBackdrop} pointerEvents="auto">
          <Pressable style={themedStyles.modalScrim} onPress={handleCloseExportModal} />
          <View style={themedStyles.modalCard}>
            <ThemedText variant="h1" style={themedStyles.modalTitle}>
              Export settings
            </ThemedText>
            <ThemedText variant="body" color="muted" style={themedStyles.modalSubtitle}>
              Confirm the title and legend text that will appear in the spreadsheet.
            </ThemedText>
            <View style={themedStyles.modalFields}>
              <TextInput
                label="Title"
                value={exportTitle}
                onChangeText={setExportTitle}
                containerStyle={themedStyles.modalField}
                onKeyDown={handleModalKeyDown}
                keyDownEvents={modalKeyEvents}
                autoFocus
              />
              <TextInput
                label="Legend (3)"
                value={legend3}
                onChangeText={setLegend3}
                containerStyle={themedStyles.modalField}
                onKeyDown={handleModalKeyDown}
                keyDownEvents={modalKeyEvents}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TextInput
                label="Legend (2)"
                value={legend2}
                onChangeText={setLegend2}
                containerStyle={themedStyles.modalField}
                onKeyDown={handleModalKeyDown}
                keyDownEvents={modalKeyEvents}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TextInput
                label="Legend (1)"
                value={legend1}
                onChangeText={setLegend1}
                containerStyle={themedStyles.modalField}
                onKeyDown={handleModalKeyDown}
                keyDownEvents={modalKeyEvents}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              <TextInput
                label="Legend (0)"
                value={legend0}
                onChangeText={setLegend0}
                containerStyle={themedStyles.modalField}
                onKeyDown={handleModalKeyDown}
                keyDownEvents={modalKeyEvents}
              />
            </View>
            <View style={themedStyles.modalActions}>
              <Button variant="outline" onPress={handleCloseExportModal} size="sm">
                Cancel
              </Button>
              <View style={themedStyles.modalActionSpacer} />
              <Button onPress={handleConfirmExport} size="sm" disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </View>
          </View>
        </View>
      ) : null}
      {showImportModal ? (
        <View style={themedStyles.modalBackdrop} pointerEvents="auto">
          <Pressable style={themedStyles.modalScrim} onPress={handleCloseImportModal} />
          <View style={themedStyles.modalCard}>
            <ThemedText variant="h1" style={themedStyles.modalTitle}>
              Import responses
            </ThemedText>
            <ThemedText variant="body" color="muted" style={themedStyles.modalSubtitle}>
              Confirm company names and resolve any mismatched rows before importing.
            </ThemedText>
            <ScrollView style={themedStyles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={themedStyles.modalSection}>
                <ThemedText variant="label" style={themedStyles.modalSectionTitle}>
                  Files
                </ThemedText>
                {pendingImports.map((entry) => (
                  <View key={entry.id} style={themedStyles.importCard}>
                    <ThemedText variant="label">{entry.filename}</ThemedText>
                    <ThemedText style={themedStyles.importFilename}>
                      {entry.sheetTitle ? `Sheet: ${entry.sheetTitle}` : 'Sheet: (unnamed)'}
                    </ThemedText>
                    <TextInput
                      label="Company name"
                      value={entry.companyName}
                      onChangeText={(value) => updatePendingCompanyName(entry.id, value)}
                      containerStyle={{ marginTop: theme.spacing[2] }}
                      error={
                        invalidCompanyIds.has(entry.id) ? 'Company name is required.' : undefined
                      }
                    />
                  </View>
                ))}
              </View>

              <View style={themedStyles.modalSection}>
                <ThemedText variant="label" style={themedStyles.modalSectionTitle}>
                  Rows needing review
                </ThemedText>
                <View style={themedStyles.reviewTable}>
                  <View style={themedStyles.reviewHeaderRow}>
                    <View style={[themedStyles.reviewHeaderCell, { flex: 1.1 }]}>
                      <ThemedText style={themedStyles.reviewHeaderText}>Company</ThemedText>
                    </View>
                    <View style={[themedStyles.reviewHeaderCell, { flex: 0.6 }]}>
                      <ThemedText style={themedStyles.reviewHeaderText}>Imported #</ThemedText>
                    </View>
                    <View style={[themedStyles.reviewHeaderCell, { flex: 2.2 }]}>
                      <ThemedText style={themedStyles.reviewHeaderText}>Imported Text</ThemedText>
                    </View>
                    <View style={[themedStyles.reviewHeaderCell, { flex: 0.9 }]}>
                      <ThemedText style={themedStyles.reviewHeaderText}>Map To #</ThemedText>
                    </View>
                    <View style={[themedStyles.reviewHeaderCell, { flex: 0.7 }]}>
                      <ThemedText style={themedStyles.reviewHeaderText}>Ignore</ThemedText>
                    </View>
                  </View>

                  {reviewItems.length === 0 ? (
                    <View style={themedStyles.reviewEmpty}>
                      <ThemedText variant="body" color="muted">
                        All rows matched your current requirements.
                      </ThemedText>
                    </View>
                  ) : (
                    reviewItems.map((item, index) => {
                      const companyName =
                        pendingImportById.get(item.importId)?.companyName ?? 'Unknown';
                      const missing = reviewFlags.missing.has(item.id);
                      const invalid = reviewFlags.invalid.has(item.id);
                      const duplicate = reviewFlags.duplicateIds.has(item.id);
                      const showError = !item.ignored && (missing || invalid || duplicate);
                      const reasonLabel =
                        item.reason === 'missing' ? 'Missing requirement' : 'Text mismatch';
                      return (
                        <View
                          key={item.id}
                          style={[
                            themedStyles.reviewRow,
                            index % 2 === 0
                              ? themedStyles.reviewRowEven
                              : themedStyles.reviewRowOdd,
                          ]}
                        >
                          <View style={[themedStyles.reviewCell, { flex: 1.1 }]}>
                            <ThemedText style={themedStyles.reviewCellText} numberOfLines={1}>
                              {companyName}
                            </ThemedText>
                          </View>
                          <View style={[themedStyles.reviewCell, { flex: 0.6 }]}>
                            <ThemedText style={themedStyles.reviewCellText}>
                              {item.number || '—'}
                            </ThemedText>
                          </View>
                          <View style={[themedStyles.reviewCell, { flex: 2.2 }]}>
                            <ThemedText style={themedStyles.reviewCellText} numberOfLines={2}>
                              {item.text || '—'}
                            </ThemedText>
                            <ThemedText style={themedStyles.reviewCellMuted}>
                              {reasonLabel}
                            </ThemedText>
                          </View>
                          <View style={[themedStyles.reviewCell, { flex: 0.9 }]}>
                            <TextInput
                              value={item.mappedNumber}
                              onChangeText={(value) => updateReviewItem(item.id, value)}
                              placeholder="Map #"
                              containerStyle={themedStyles.reviewCellInputWrapper}
                              inputStyle={themedStyles.reviewCellInput}
                              error={showError ? ' ' : undefined}
                              hideErrorMessage
                            />
                          </View>
                          <View style={[themedStyles.reviewCell, { flex: 0.7 }]}>
                            <Pressable
                              style={[
                                themedStyles.reviewPill,
                                item.ignored && themedStyles.reviewPillActive,
                              ]}
                              onPress={() => toggleReviewIgnore(item.id)}
                            >
                              <ThemedText
                                style={[
                                  themedStyles.reviewPillText,
                                  item.ignored && themedStyles.reviewPillTextActive,
                                ]}
                              >
                                {item.ignored ? 'Ignored' : 'Ignore'}
                              </ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>

              <ThemedText style={themedStyles.reviewHint}>{reviewHintMessage}</ThemedText>
              {reviewFlags.duplicateIds.size > 0 ? (
                <ThemedText style={[themedStyles.reviewHint, themedStyles.reviewHintWarning]}>
                  Duplicate mappings detected. Only the first match will be imported.
                </ThemedText>
              ) : null}
            </ScrollView>
            <View style={themedStyles.modalActions}>
              <Button variant="outline" onPress={handleCloseImportModal} size="sm">
                Cancel
              </Button>
              <View style={themedStyles.modalActionSpacer} />
              <Button onPress={handleConfirmImport} size="sm" disabled={importDisabled}>
                {isApplyingImport ? 'Importing...' : 'Import'}
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

import {
  createProject,
  generateSpreadsheet,
  initDatabase,
  listProjects,
  loadProjectRequirements,
  type ProjectRecord,
  type StoredRequirementRow,
  saveProjectRequirements,
  seedSampleProjects,
  touchProject,
} from '@repo/core';
import {
  Button,
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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

  const exportColumns = useMemo(
    () => [
      { header: 'Number', width: 12 },
      { header: 'Requirement', width: 80 },
      { header: 'Status', width: 16 },
      { header: 'Contractor Response', width: 40 },
      { header: 'Contractor Notes', width: 40 },
    ],
    [],
  );

  const buildExportRows = useCallback(
    () => rows.map((row, index) => [numbers[index] ?? `${index + 1}`, row.text, '', '', '']),
    [numbers, rows],
  );

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
  }, [markRowsSaved, resetExportState, selectedProjectId]);

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

      const filePath = await generateSpreadsheet(buildExportRows(), {
        columns: exportColumns,
        filePath: normalizedPath,
      });
      setExportPath(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export spreadsheet.';
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }, [buildExportRows, exportColumns, selectedProject?.name]);

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
    void runExport();
  }, [numbers, rows, runExport, selectedProjectId]);

  const handleExportAnyway = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
    void runExport();
  }, [runExport]);

  const handleCancelWarning = useCallback(() => {
    setShowEmptyWarning(false);
    setEmptyRowNumbers([]);
  }, []);

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
        editorPanel: {
          width: '100%',
          borderRadius: theme.radius.none,
          padding: theme.spacing[4],
          backgroundColor: `${theme.colors.card}E6`,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        emptyState: {
          width: '100%',
          padding: theme.spacing[6],
          borderRadius: theme.radius.none,
          backgroundColor: `${theme.colors.card}E6`,
          borderWidth: 1,
          borderColor: theme.colors.border,
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

      <View style={themedStyles.layout}>
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
                  </View>
                </View>

                <ThemedText variant="body" style={themedStyles.headerHint}>
                  Use Tab to indent, Shift+Tab to outdent, and Enter to add a new row.
                </ThemedText>

                {saveStatus === 'error' && saveError ? (
                  <ThemedText style={[themedStyles.exportStatus, themedStyles.errorText]}>
                    {saveError}
                  </ThemedText>
                ) : null}

                {(exportPath || exportError || showEmptyWarning) && (
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
                  </View>
                )}
              </View>

              <View style={themedStyles.editorPanel}>
                <RequirementsEditor rows={rows} onRowsChange={setRows} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

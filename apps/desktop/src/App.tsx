import type {
  BaseCapabilityMatrixDto,
  CreateOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityDto,
  RequirementDto,
} from '@cmm/contracts';
import { Button, Field, TextArea, TextInput } from '@cmm/ui';
import type { FormEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

type OpportunityFormState = {
  name: string;
  solicitationNumber: string;
  issuingAgency: string;
  description: string;
};

type OpportunityListMode = 'active' | 'archived';

type OpenedOpportunityState = OpenOpportunityIpcOutput & {
  lifecycle: OpportunityListMode;
};

type MatrixSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed' | 'conflicted';
type MatrixFlushResult = 'clean' | 'saved' | 'dirty' | 'failed' | 'conflicted';
type MatrixFlushOptions = {
  force?: boolean;
};
type BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements: boolean;
  includeRetiredRequirements: boolean;
};
type ExportPreflightState = BaseCapabilityMatrixExportChoices & {
  blankRequirementCount: number;
  retiredRequirementCount: number;
};

type NumberedRequirement = {
  requirement: RequirementDto;
  displayNumber: string;
};

const emptyForm: OpportunityFormState = {
  name: '',
  solicitationNumber: '',
  issuingAgency: '',
  description: '',
};

const autosaveDelayMs = 500;

const orderRequirements = (requirements: RequirementDto[]): RequirementDto[] =>
  [...requirements].sort((left, right) => left.position - right.position);

const findRequirementSubtreeEndIndex = (
  requirements: RequirementDto[],
  startIndex: number,
): number => {
  const root = requirements[startIndex];
  if (!root) {
    return startIndex;
  }

  let endIndex = startIndex + 1;
  while (endIndex < requirements.length && (requirements[endIndex]?.level ?? 1) > root.level) {
    endIndex += 1;
  }
  return endIndex;
};

const normalizeRequirementPositions = (requirements: RequirementDto[]): RequirementDto[] =>
  requirements.map((requirement, position) => ({
    ...requirement,
    level: Math.max(1, requirement.level),
    position,
  }));

const computeRequirementNumbers = (
  requirements: RequirementDto[],
  includeRetired: boolean,
): NumberedRequirement[] => {
  const counters: number[] = [];
  return orderRequirements(requirements)
    .filter((requirement) => includeRetired || requirement.retiredAt === null)
    .map((requirement) => {
      const level = Math.max(1, requirement.level);
      counters.length = level;
      counters[level - 1] = (counters[level - 1] ?? 0) + 1;
      for (let index = 0; index < level - 1; index += 1) {
        counters[index] = counters[index] ?? 1;
      }
      return {
        requirement,
        displayNumber: counters.slice(0, level).join('.'),
      };
    });
};

const createRequirementId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `requirement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const requirementTextInputId = (requirementId: string): string =>
  `requirement-text-${requirementId}`;

const toCreateInput = (form: OpportunityFormState): CreateOpportunityIpcInput => ({
  name: form.name,
  solicitationNumber: form.solicitationNumber || null,
  issuingAgency: form.issuingAgency || null,
  description: form.description || null,
});

const formatOpenedAt = (opportunity: OpportunityDto): string => {
  if (!opportunity.lastOpenedAt) {
    return 'Not opened yet';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(opportunity.lastOpenedAt));
};

const getErrorMessage = (unknownError: unknown, fallback: string): string =>
  unknownError instanceof Error ? unknownError.message : fallback;

const isBaseCapabilityMatrixRevisionConflict = (message: string): boolean =>
  message.includes('changed since') || message.includes('revision conflict');

const defaultExportChoices: BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements: false,
  includeRetiredRequirements: false,
};

const getExportPreflightState = (matrix: BaseCapabilityMatrixDto): ExportPreflightState | null => {
  const blankRequirementCount = matrix.requirements.filter(
    (requirement) => requirement.text.trim().length === 0,
  ).length;
  const retiredRequirementCount = matrix.requirements.filter(
    (requirement) => requirement.retiredAt !== null,
  ).length;

  if (blankRequirementCount === 0 && retiredRequirementCount === 0) {
    return null;
  }

  return {
    ...defaultExportChoices,
    blankRequirementCount,
    retiredRequirementCount,
  };
};

function App(): React.JSX.Element {
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [archivedOpportunities, setArchivedOpportunities] = useState<OpportunityDto[]>([]);
  const [listMode, setListMode] = useState<OpportunityListMode>('active');
  const [openedOpportunity, setOpenedOpportunity] = useState<OpenedOpportunityState | null>(null);
  const [showRetiredRequirements, setShowRetiredRequirements] = useState(false);
  const [matrixSaveState, setMatrixSaveState] = useState<MatrixSaveState>('idle');
  const [exportPreflight, setExportPreflight] = useState<ExportPreflightState | null>(null);
  const [pendingRequirementFocusId, setPendingRequirementFocusId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<OpportunityFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const openedOpportunityRef = useRef<OpenedOpportunityState | null>(null);
  const matrixSaveStateRef = useRef<MatrixSaveState>('idle');
  const draftVersionRef = useRef(0);
  const savePromiseRef = useRef<Promise<MatrixFlushResult> | null>(null);

  const refreshOpportunities = useCallback(async () => {
    const [active, archived] = await Promise.all([
      window.cmmApi.listActiveOpportunities(),
      window.cmmApi.listArchivedOpportunities(),
    ]);
    setOpportunities(active);
    setArchivedOpportunities(archived);
  }, []);

  useEffect(() => {
    void refreshOpportunities().catch((unknownError: unknown) => {
      setError(getErrorMessage(unknownError, 'Unable to load Opportunities.'));
    });
  }, [refreshOpportunities]);

  useEffect(() => {
    openedOpportunityRef.current = openedOpportunity;
  }, [openedOpportunity]);

  useEffect(() => {
    matrixSaveStateRef.current = matrixSaveState;
  }, [matrixSaveState]);

  useEffect(() => {
    if (!pendingRequirementFocusId) {
      return;
    }

    const input = document.getElementById(
      requirementTextInputId(pendingRequirementFocusId),
    ) as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.focus();
    setPendingRequirementFocusId(null);
  }, [pendingRequirementFocusId]);

  const setTrackedMatrixSaveState = useCallback((state: MatrixSaveState) => {
    matrixSaveStateRef.current = state;
    setMatrixSaveState(state);
  }, []);

  const flushBaseCapabilityMatrix = useCallback(
    async (options: MatrixFlushOptions = {}): Promise<MatrixFlushResult> => {
      if (savePromiseRef.current) {
        return savePromiseRef.current;
      }

      const current = openedOpportunityRef.current;
      const currentSaveState = matrixSaveStateRef.current;
      if (!current || current.lifecycle === 'archived') {
        return 'clean';
      }

      if (currentSaveState === 'conflicted' && !options.force) {
        return 'conflicted';
      }

      if (
        currentSaveState !== 'dirty' &&
        currentSaveState !== 'failed' &&
        !(currentSaveState === 'conflicted' && options.force)
      ) {
        return 'clean';
      }

      const matrixSnapshot = current.baseCapabilityMatrix;
      const savedOpportunityId = current.opportunity.id;
      const saveDraftVersion = draftVersionRef.current;

      const savePromise = (async (): Promise<MatrixFlushResult> => {
        setError(null);
        setTrackedMatrixSaveState('saving');

        try {
          const saved = await window.cmmApi.saveBaseCapabilityMatrix(matrixSnapshot);
          const wasSuperseded = draftVersionRef.current !== saveDraftVersion;

          setOpenedOpportunity((latest) => {
            if (
              !latest ||
              latest.lifecycle !== 'active' ||
              latest.opportunity.id !== savedOpportunityId
            ) {
              return latest;
            }

            return {
              ...latest,
              baseCapabilityMatrix: wasSuperseded
                ? {
                    ...latest.baseCapabilityMatrix,
                    revision: saved.revision,
                  }
                : saved,
            };
          });

          setTrackedMatrixSaveState(wasSuperseded ? 'dirty' : 'saved');
          return wasSuperseded ? 'dirty' : 'saved';
        } catch (unknownError) {
          const message = getErrorMessage(unknownError, 'Unable to save Base Capability Matrix.');
          const nextState = isBaseCapabilityMatrixRevisionConflict(message)
            ? 'conflicted'
            : 'failed';
          setError(message);
          setTrackedMatrixSaveState(nextState);
          return nextState;
        } finally {
          savePromiseRef.current = null;
        }
      })();

      savePromiseRef.current = savePromise;
      return savePromise;
    },
    [setTrackedMatrixSaveState],
  );

  const flushBaseCapabilityMatrixBeforeProceeding = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await flushBaseCapabilityMatrix();
      if (result === 'clean' || result === 'saved') {
        return true;
      }

      if (result !== 'dirty') {
        setError(
          result === 'conflicted'
            ? 'Resolve the Base Capability Matrix conflict before continuing.'
            : 'Save or discard Base Capability Matrix edits before continuing.',
        );
        return false;
      }
    }

    setError('Save or discard Base Capability Matrix edits before continuing.');
    return false;
  }, [flushBaseCapabilityMatrix]);

  useEffect(
    () => window.cmmApi.onWindowCloseRequest(flushBaseCapabilityMatrixBeforeProceeding),
    [flushBaseCapabilityMatrixBeforeProceeding],
  );

  useEffect(() => {
    if (
      matrixSaveState !== 'dirty' ||
      !openedOpportunity ||
      openedOpportunity.lifecycle === 'archived'
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void flushBaseCapabilityMatrix();
    }, autosaveDelayMs);

    return () => window.clearTimeout(timer);
  }, [flushBaseCapabilityMatrix, matrixSaveState, openedOpportunity]);

  const openOpportunity = async (opportunityId: string) => {
    const current = openedOpportunityRef.current;
    if (
      current &&
      (current.opportunity.id !== opportunityId || current.lifecycle !== listMode) &&
      !(await flushBaseCapabilityMatrixBeforeProceeding())
    ) {
      return;
    }

    setError(null);
    const opened =
      listMode === 'active'
        ? await window.cmmApi.openOpportunity({ opportunityId })
        : await window.cmmApi.openArchivedOpportunity({ opportunityId });
    setOpenedOpportunity({
      ...opened,
      lifecycle: listMode,
    });
    setShowRetiredRequirements(false);
    setExportPreflight(null);
    draftVersionRef.current = 0;
    setTrackedMatrixSaveState('idle');
    await refreshOpportunities();
  };

  const updateMatrixDraft = (
    updater: (matrix: BaseCapabilityMatrixDto) => BaseCapabilityMatrixDto,
  ) => {
    if (isArchivedWorkspace) {
      return;
    }

    draftVersionRef.current += 1;
    setExportPreflight(null);
    setOpenedOpportunity((current) => {
      if (!current || current.lifecycle === 'archived') {
        return current;
      }

      const updatedMatrix = updater(current.baseCapabilityMatrix);
      return {
        ...current,
        baseCapabilityMatrix: {
          ...updatedMatrix,
          requirements: normalizeRequirementPositions(updatedMatrix.requirements),
        },
      };
    });
    if (matrixSaveStateRef.current !== 'conflicted') {
      setTrackedMatrixSaveState('dirty');
    }
  };

  const addRequirement = () => {
    updateMatrixDraft((matrix) => ({
      ...matrix,
      requirements: [
        ...orderRequirements(matrix.requirements),
        {
          id: createRequirementId(),
          text: '',
          level: 1,
          position: matrix.requirements.length,
          retiredAt: null,
        },
      ],
    }));
  };

  const insertRequirementAfter = (requirementId: string) => {
    if (!openedOpportunity || openedOpportunity.lifecycle === 'archived') {
      return;
    }

    const requirements = orderRequirements(openedOpportunity.baseCapabilityMatrix.requirements);
    const currentIndex = requirements.findIndex((requirement) => requirement.id === requirementId);
    const currentRequirement = requirements[currentIndex];
    if (!currentRequirement || currentRequirement.retiredAt !== null) {
      return;
    }

    const nextRequirementId = createRequirementId();
    updateMatrixDraft((matrix) => {
      const orderedRequirements = orderRequirements(matrix.requirements);
      const insertIndex = orderedRequirements.findIndex(
        (requirement) => requirement.id === requirementId,
      );
      const precedingRequirement = orderedRequirements[insertIndex];
      if (!precedingRequirement || precedingRequirement.retiredAt !== null) {
        return matrix;
      }

      return {
        ...matrix,
        requirements: [
          ...orderedRequirements.slice(0, insertIndex + 1),
          {
            id: nextRequirementId,
            text: '',
            level: precedingRequirement.level,
            position: insertIndex + 1,
            retiredAt: null,
          },
          ...orderedRequirements.slice(insertIndex + 1),
        ],
      };
    });
    setPendingRequirementFocusId(nextRequirementId);
  };

  const editRequirementText = (requirementId: string, text: string) => {
    updateMatrixDraft((matrix) => ({
      ...matrix,
      requirements: matrix.requirements.map((requirement) =>
        requirement.id === requirementId
          ? {
              ...requirement,
              text,
            }
          : requirement,
      ),
    }));
  };

  const moveRequirement = (requirementId: string, direction: -1 | 1) => {
    updateMatrixDraft((matrix) => {
      const requirements = orderRequirements(matrix.requirements);
      const currentIndex = requirements.findIndex(
        (requirement) => requirement.id === requirementId,
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= requirements.length) {
        return matrix;
      }

      const [moved] = requirements.splice(currentIndex, 1);
      if (!moved) {
        return matrix;
      }

      requirements.splice(nextIndex, 0, moved);
      return {
        ...matrix,
        requirements,
      };
    });
  };

  const indentRequirement = (requirementId: string) => {
    updateMatrixDraft((matrix) => {
      const requirements = orderRequirements(matrix.requirements);
      const currentIndex = requirements.findIndex(
        (requirement) => requirement.id === requirementId,
      );
      const requirement = requirements[currentIndex];
      const previousRequirement = requirements[currentIndex - 1];
      if (!requirement || !previousRequirement) {
        return matrix;
      }

      const nextLevel = Math.min(requirement.level + 1, previousRequirement.level + 1);
      const levelDelta = nextLevel - requirement.level;
      if (levelDelta === 0) {
        return matrix;
      }

      const subtreeEndIndex = findRequirementSubtreeEndIndex(requirements, currentIndex);
      return {
        ...matrix,
        requirements: requirements.map((row, rowIndex) =>
          rowIndex >= currentIndex && rowIndex < subtreeEndIndex
            ? {
                ...row,
                level: row.level + levelDelta,
              }
            : row,
        ),
      };
    });
  };

  const outdentRequirement = (requirementId: string) => {
    updateMatrixDraft((matrix) => {
      const requirements = orderRequirements(matrix.requirements);
      const currentIndex = requirements.findIndex(
        (requirement) => requirement.id === requirementId,
      );
      const requirement = requirements[currentIndex];
      if (!requirement || requirement.level === 1) {
        return matrix;
      }

      const subtreeEndIndex = findRequirementSubtreeEndIndex(requirements, currentIndex);
      return {
        ...matrix,
        requirements: requirements.map((row, rowIndex) =>
          rowIndex >= currentIndex && rowIndex < subtreeEndIndex
            ? {
                ...row,
                level: Math.max(1, row.level - 1),
              }
            : row,
        ),
      };
    });
  };

  const retireRequirement = (requirementId: string) => {
    updateMatrixDraft((matrix) => ({
      ...matrix,
      requirements: matrix.requirements.map((requirement) =>
        requirement.id === requirementId
          ? {
              ...requirement,
              retiredAt: new Date().toISOString(),
            }
          : requirement,
      ),
    }));
  };

  const canIndentRequirement = (requirementId: string): boolean => {
    if (!openedOpportunity || openedOpportunity.lifecycle === 'archived') {
      return false;
    }

    const requirements = orderRequirements(openedOpportunity.baseCapabilityMatrix.requirements);
    const currentIndex = requirements.findIndex((requirement) => requirement.id === requirementId);
    const requirement = requirements[currentIndex];
    const previousRequirement = requirements[currentIndex - 1];
    if (!requirement || !previousRequirement) {
      return false;
    }

    return Math.min(requirement.level + 1, previousRequirement.level + 1) > requirement.level;
  };

  const canOutdentRequirement = (requirementId: string): boolean => {
    if (!openedOpportunity || openedOpportunity.lifecycle === 'archived') {
      return false;
    }

    const requirement = openedOpportunity.baseCapabilityMatrix.requirements.find(
      (candidate) => candidate.id === requirementId,
    );
    return (requirement?.level ?? 1) > 1;
  };

  const handleRequirementTextKeyDown =
    (requirementId: string) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        insertRequirementAfter(requirementId);
        return;
      }

      if (event.key === 'Tab') {
        if (
          event.shiftKey
            ? !canOutdentRequirement(requirementId)
            : !canIndentRequirement(requirementId)
        ) {
          return;
        }

        event.preventDefault();
        if (event.shiftKey) {
          outdentRequirement(requirementId);
        } else {
          indentRequirement(requirementId);
        }
        setPendingRequirementFocusId(requirementId);
        return;
      }

      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !event.shiftKey) {
        const selectionStart = event.currentTarget.selectionStart;
        const selectionEnd = event.currentTarget.selectionEnd;
        if (selectionStart !== selectionEnd) {
          return;
        }

        const editableRequirementIds = numberedRequirements
          .filter(({ requirement }) => requirement.retiredAt === null)
          .map(({ requirement }) => requirement.id);
        const currentIndex = editableRequirementIds.indexOf(requirementId);
        const nextIndex = currentIndex + (event.key === 'ArrowDown' ? 1 : -1);
        const nextRequirementId = editableRequirementIds[nextIndex];
        if (!nextRequirementId) {
          return;
        }

        event.preventDefault();
        setPendingRequirementFocusId(nextRequirementId);
      }
    };

  const saveMatrix = async () => {
    await flushBaseCapabilityMatrix({ force: matrixSaveStateRef.current === 'conflicted' });
  };

  const discardMatrixDraft = async () => {
    const current = openedOpportunityRef.current;
    if (!current || current.lifecycle !== 'active') {
      return;
    }

    setError(null);
    try {
      const opened = await window.cmmApi.openOpportunity({
        opportunityId: current.opportunity.id,
      });
      setOpenedOpportunity({
        ...opened,
        lifecycle: 'active',
      });
      draftVersionRef.current = 0;
      setShowRetiredRequirements(false);
      setExportPreflight(null);
      setTrackedMatrixSaveState('idle');
      await refreshOpportunities();
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to reload Base Capability Matrix.'));
    }
  };

  const stayOnCurrentOpportunity = () => {
    setError(null);
  };

  const createOpportunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const created = await window.cmmApi.createOpportunity(toCreateInput(form));
      setForm(emptyForm);
      setIsCreating(false);
      await openOpportunity(created.id);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to create Opportunity.'));
    }
  };

  const archiveOpenedOpportunity = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle !== 'active') {
      return;
    }

    setError(null);
    try {
      if (!(await flushBaseCapabilityMatrixBeforeProceeding())) {
        return;
      }

      const archived = await window.cmmApi.archiveOpportunity({
        opportunityId: openedOpportunity.opportunity.id,
      });
      await refreshOpportunities();
      setListMode('archived');
      setOpenedOpportunity({
        ...openedOpportunity,
        opportunity: archived,
        lifecycle: 'archived',
      });
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to archive Opportunity.'));
    }
  };

  const exportOpenedBaseCapabilityMatrix = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle !== 'active') {
      return;
    }

    setError(null);
    setNotice(null);
    setExportPreflight(null);
    try {
      if (!(await flushBaseCapabilityMatrixBeforeProceeding())) {
        return;
      }

      const current = openedOpportunityRef.current;
      if (!current || current.lifecycle !== 'active') {
        return;
      }

      const preflight = getExportPreflightState(current.baseCapabilityMatrix);
      if (preflight) {
        setExportPreflight(preflight);
        return;
      }

      await exportBaseCapabilityMatrix(defaultExportChoices);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to export Base Capability Matrix.'));
    }
  };

  const exportBaseCapabilityMatrix = async (exportChoices: BaseCapabilityMatrixExportChoices) => {
    const current = openedOpportunityRef.current;
    if (!current || current.lifecycle !== 'active') {
      return;
    }

    const result = await window.cmmApi.exportBaseCapabilityMatrix({
      opportunityId: current.opportunity.id,
      ...exportChoices,
    });
    setNotice(result.status === 'exported' ? `Exported ${result.filename}` : 'Export canceled.');
  };

  const confirmExportPreflight = async () => {
    if (!exportPreflight) {
      return;
    }

    setError(null);
    setNotice(null);
    try {
      if (!(await flushBaseCapabilityMatrixBeforeProceeding())) {
        return;
      }

      const { includeBlankRequirements, includeRetiredRequirements } = exportPreflight;
      setExportPreflight(null);
      await exportBaseCapabilityMatrix({
        includeBlankRequirements,
        includeRetiredRequirements,
      });
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to export Base Capability Matrix.'));
    }
  };

  const restoreOpenedOpportunity = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle !== 'archived') {
      return;
    }

    setError(null);
    try {
      const restored = await window.cmmApi.restoreArchivedOpportunity({
        opportunityId: openedOpportunity.opportunity.id,
      });
      await refreshOpportunities();
      setListMode('active');
      setOpenedOpportunity({
        ...openedOpportunity,
        opportunity: restored,
        lifecycle: 'active',
      });
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to restore Opportunity.'));
    }
  };

  const hardDeleteOpenedOpportunity = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle !== 'archived') {
      return;
    }

    const confirmed = window.confirm(
      'Hard delete this archived Opportunity? This cannot be undone.',
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await window.cmmApi.hardDeleteArchivedOpportunity({
        opportunityId: openedOpportunity.opportunity.id,
      });
      await refreshOpportunities();
      setListMode('archived');
      setOpenedOpportunity(null);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError, 'Unable to hard delete Opportunity.'));
    }
  };

  const visibleOpportunities = listMode === 'active' ? opportunities : archivedOpportunities;
  const emptyListLabel =
    listMode === 'active' ? 'No Opportunities yet' : 'No archived Opportunities';
  const isArchivedWorkspace = openedOpportunity?.lifecycle === 'archived';
  const numberedRequirements = openedOpportunity
    ? computeRequirementNumbers(
        openedOpportunity.baseCapabilityMatrix.requirements,
        showRetiredRequirements,
      )
    : [];
  const retiredRequirementCount =
    openedOpportunity?.baseCapabilityMatrix.requirements.filter(
      (requirement) => requirement.retiredAt !== null,
    ).length ?? 0;
  const matrixStatusLabel =
    matrixSaveState === 'dirty'
      ? 'Dirty'
      : matrixSaveState === 'saving'
        ? 'Saving'
        : matrixSaveState === 'saved'
          ? 'Saved'
          : matrixSaveState === 'conflicted'
            ? 'Conflicted'
            : matrixSaveState === 'failed'
              ? 'Failed'
              : '';

  return (
    <div className="app-shell">
      <aside className="opportunity-sidebar" aria-label="Opportunity navigation">
        <div className="sidebar-header">
          <h1>Opportunities</h1>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            New Opportunity
          </Button>
        </div>

        <nav className="opportunity-list-tabs" aria-label="Opportunity list">
          <Button
            aria-pressed={listMode === 'active'}
            className={listMode === 'active' ? 'list-tab list-tab-active' : 'list-tab'}
            variant="ghost"
            onClick={() => setListMode('active')}
          >
            Active
          </Button>
          <Button
            aria-pressed={listMode === 'archived'}
            className={listMode === 'archived' ? 'list-tab list-tab-active' : 'list-tab'}
            variant="ghost"
            onClick={() => setListMode('archived')}
          >
            Archived
          </Button>
        </nav>

        {isCreating ? (
          <form className="opportunity-form" onSubmit={createOpportunity}>
            <Field htmlFor="opportunity-name" label="Opportunity name">
              <TextInput
                autoFocus
                id="opportunity-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field htmlFor="solicitation-number" label="Solicitation Number">
              <TextInput
                id="solicitation-number"
                value={form.solicitationNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, solicitationNumber: event.target.value }))
                }
              />
            </Field>
            <Field htmlFor="issuing-agency" label="Issuing Agency">
              <TextInput
                id="issuing-agency"
                value={form.issuingAgency}
                onChange={(event) =>
                  setForm((current) => ({ ...current, issuingAgency: event.target.value }))
                }
              />
            </Field>
            <Field htmlFor="opportunity-description" label="Description">
              <TextArea
                id="opportunity-description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Opportunity
              </Button>
            </div>
          </form>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}

        <div className="opportunity-list">
          {visibleOpportunities.length === 0 ? (
            <p className="empty-state">{emptyListLabel}</p>
          ) : (
            visibleOpportunities.map((opportunity) => (
              <button
                aria-label={`Open ${opportunity.name}`}
                className={
                  openedOpportunity?.opportunity.id === opportunity.id &&
                  openedOpportunity.lifecycle === listMode
                    ? 'opportunity-row opportunity-row-active'
                    : 'opportunity-row'
                }
                key={opportunity.id}
                onClick={() => void openOpportunity(opportunity.id)}
                type="button"
              >
                <span className="opportunity-row-name">{opportunity.name}</span>
                <span className="opportunity-row-meta">{formatOpenedAt(opportunity)}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="workspace">
        {openedOpportunity ? (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">{openedOpportunity.opportunity.name}</p>
                <h2>Base Capability Matrix</h2>
              </div>
              <div className="workspace-actions">
                {isArchivedWorkspace ? (
                  <>
                    <span className="read-only-badge">Read-only</span>
                    <Button variant="secondary" onClick={() => void restoreOpenedOpportunity()}>
                      Restore Opportunity
                    </Button>
                    <Button
                      className="destructive-action"
                      variant="secondary"
                      onClick={() => void hardDeleteOpenedOpportunity()}
                    >
                      Hard delete Opportunity
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => void archiveOpenedOpportunity()}>
                    Archive Opportunity
                  </Button>
                )}
                {openedOpportunity.opportunity.solicitationNumber ? (
                  <span className="solicitation-number">
                    {openedOpportunity.opportunity.solicitationNumber}
                  </span>
                ) : null}
              </div>
            </header>
            <section
              className="matrix-workspace"
              aria-label={
                isArchivedWorkspace
                  ? 'Read-only Base Capability Matrix workspace'
                  : 'Base Capability Matrix workspace'
              }
            >
              {!isArchivedWorkspace ? (
                <div className="matrix-toolbar">
                  <Button variant="primary" onClick={addRequirement}>
                    Add Requirement
                  </Button>
                  <Button
                    disabled={matrixSaveState === 'saving'}
                    variant="secondary"
                    onClick={() => void exportOpenedBaseCapabilityMatrix()}
                  >
                    Export Workbook
                  </Button>
                  <Button
                    disabled={matrixSaveState === 'saving'}
                    variant="secondary"
                    onClick={() => void saveMatrix()}
                  >
                    Save Matrix
                  </Button>
                  {retiredRequirementCount > 0 ? (
                    <Button
                      aria-pressed={showRetiredRequirements}
                      variant="ghost"
                      onClick={() => setShowRetiredRequirements((current) => !current)}
                    >
                      {showRetiredRequirements
                        ? 'Hide retired Requirements'
                        : 'Show retired Requirements'}
                    </Button>
                  ) : null}
                  {matrixStatusLabel ? (
                    <span className="matrix-save-status">{matrixStatusLabel}</span>
                  ) : null}
                  {matrixSaveState === 'failed' || matrixSaveState === 'conflicted' ? (
                    <div className="matrix-recovery-actions">
                      <Button variant="secondary" onClick={() => void saveMatrix()}>
                        Retry save
                      </Button>
                      <Button variant="secondary" onClick={() => void discardMatrixDraft()}>
                        Discard local draft
                      </Button>
                      <Button variant="ghost" onClick={stayOnCurrentOpportunity}>
                        Stay on this Opportunity
                      </Button>
                    </div>
                  ) : null}
                  {notice ? <span className="matrix-save-status">{notice}</span> : null}
                  {exportPreflight ? (
                    <section aria-label="Export preflight choices" className="export-preflight">
                      {exportPreflight.blankRequirementCount > 0 ? (
                        <div className="export-preflight-choice">
                          <label className="export-preflight-option">
                            <input
                              checked={exportPreflight.includeBlankRequirements}
                              type="checkbox"
                              onChange={(event) =>
                                setExportPreflight((current) =>
                                  current
                                    ? {
                                        ...current,
                                        includeBlankRequirements: event.target.checked,
                                      }
                                    : current,
                                )
                              }
                            />
                            <span>Include blank Requirements</span>
                          </label>
                          <p>
                            Blank Requirements may send draft or empty rows to potential consortium
                            members.
                          </p>
                        </div>
                      ) : null}
                      {exportPreflight.retiredRequirementCount > 0 ? (
                        <div className="export-preflight-choice">
                          <label className="export-preflight-option">
                            <input
                              checked={exportPreflight.includeRetiredRequirements}
                              type="checkbox"
                              onChange={(event) =>
                                setExportPreflight((current) =>
                                  current
                                    ? {
                                        ...current,
                                        includeRetiredRequirements: event.target.checked,
                                      }
                                    : current,
                                )
                              }
                            />
                            <span>Include retired Requirements</span>
                          </label>
                          <p>
                            Retired Requirements may reintroduce historical content into the sent
                            baseline.
                          </p>
                        </div>
                      ) : null}
                      <div className="export-preflight-actions">
                        <Button variant="primary" onClick={() => void confirmExportPreflight()}>
                          Continue Export
                        </Button>
                        <Button variant="ghost" onClick={() => setExportPreflight(null)}>
                          Cancel Export
                        </Button>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {numberedRequirements.length === 0 ? (
                <p className="matrix-empty-message">No requirements yet.</p>
              ) : (
                <ol className="matrix-outline" aria-label="Requirements">
                  {numberedRequirements.map(({ requirement, displayNumber }, index) => {
                    const isRetired = requirement.retiredAt !== null;
                    const isEditable = !isArchivedWorkspace && !isRetired;
                    return (
                      <li
                        className={
                          isRetired ? 'requirement-row requirement-row-retired' : 'requirement-row'
                        }
                        key={requirement.id}
                        style={{ marginLeft: `${Math.max(0, requirement.level - 1) * 28}px` }}
                      >
                        <span className="requirement-number">{displayNumber}</span>
                        <TextInput
                          aria-label={`Requirement ${displayNumber} text`}
                          className="requirement-text"
                          disabled={!isEditable}
                          id={requirementTextInputId(requirement.id)}
                          value={requirement.text}
                          onChange={(event) =>
                            editRequirementText(requirement.id, event.target.value)
                          }
                          onKeyDown={handleRequirementTextKeyDown(requirement.id)}
                        />
                        {isEditable ? (
                          <div className="requirement-actions">
                            <Button
                              aria-label={`Move Requirement ${displayNumber} up`}
                              disabled={index === 0}
                              variant="ghost"
                              onClick={() => moveRequirement(requirement.id, -1)}
                            >
                              Up
                            </Button>
                            <Button
                              aria-label={`Move Requirement ${displayNumber} down`}
                              disabled={index === numberedRequirements.length - 1}
                              variant="ghost"
                              onClick={() => moveRequirement(requirement.id, 1)}
                            >
                              Down
                            </Button>
                            <Button
                              aria-label={`Indent Requirement ${displayNumber}`}
                              variant="ghost"
                              onClick={() => indentRequirement(requirement.id)}
                            >
                              Indent
                            </Button>
                            <Button
                              aria-label={`Outdent Requirement ${displayNumber}`}
                              variant="ghost"
                              onClick={() => outdentRequirement(requirement.id)}
                            >
                              Outdent
                            </Button>
                            <Button
                              aria-label={`Retire Requirement ${displayNumber}`}
                              variant="ghost"
                              onClick={() => retireRequirement(requirement.id)}
                            >
                              Retire
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </>
        ) : (
          <section className="workspace-empty">
            <h2>Base Capability Matrix</h2>
            <p>Select an Opportunity to open its workspace.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

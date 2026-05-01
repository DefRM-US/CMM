import type {
  BaseCapabilityMatrixDto,
  CreateOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityDto,
  RequirementDto,
} from '@cmm/contracts';
import { Button, Field, TextArea, TextInput } from '@cmm/ui';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';

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

type MatrixSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

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

const orderRequirements = (requirements: RequirementDto[]): RequirementDto[] =>
  [...requirements].sort((left, right) => left.position - right.position);

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

function App(): React.JSX.Element {
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [archivedOpportunities, setArchivedOpportunities] = useState<OpportunityDto[]>([]);
  const [listMode, setListMode] = useState<OpportunityListMode>('active');
  const [openedOpportunity, setOpenedOpportunity] = useState<OpenedOpportunityState | null>(null);
  const [showRetiredRequirements, setShowRetiredRequirements] = useState(false);
  const [matrixSaveState, setMatrixSaveState] = useState<MatrixSaveState>('idle');
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<OpportunityFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

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
      setError(
        unknownError instanceof Error ? unknownError.message : 'Unable to load Opportunities.',
      );
    });
  }, [refreshOpportunities]);

  const openOpportunity = async (opportunityId: string) => {
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
    setMatrixSaveState('idle');
    await refreshOpportunities();
  };

  const updateMatrixDraft = (
    updater: (matrix: BaseCapabilityMatrixDto) => BaseCapabilityMatrixDto,
  ) => {
    if (isArchivedWorkspace) {
      return;
    }

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
    setMatrixSaveState('dirty');
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
      return {
        ...matrix,
        requirements: requirements.map((row) =>
          row.id === requirementId
            ? {
                ...row,
                level: nextLevel,
              }
            : row,
        ),
      };
    });
  };

  const outdentRequirement = (requirementId: string) => {
    updateMatrixDraft((matrix) => ({
      ...matrix,
      requirements: matrix.requirements.map((requirement) =>
        requirement.id === requirementId
          ? {
              ...requirement,
              level: Math.max(1, requirement.level - 1),
            }
          : requirement,
      ),
    }));
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

  const saveMatrix = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle === 'archived') {
      return;
    }

    setError(null);
    setMatrixSaveState('saving');
    try {
      const saved = await window.cmmApi.saveBaseCapabilityMatrix(
        openedOpportunity.baseCapabilityMatrix,
      );
      setOpenedOpportunity((current) =>
        current
          ? {
              ...current,
              baseCapabilityMatrix: saved,
            }
          : current,
      );
      setMatrixSaveState('saved');
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to save Base Capability Matrix.';
      setError(message);
      setMatrixSaveState(message.includes('changed since') ? 'conflict' : 'error');
    }
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
      setError(
        unknownError instanceof Error ? unknownError.message : 'Unable to create Opportunity.',
      );
    }
  };

  const archiveOpenedOpportunity = async () => {
    if (!openedOpportunity || openedOpportunity.lifecycle !== 'active') {
      return;
    }

    setError(null);
    try {
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
      setError(
        unknownError instanceof Error ? unknownError.message : 'Unable to archive Opportunity.',
      );
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
      setError(
        unknownError instanceof Error ? unknownError.message : 'Unable to restore Opportunity.',
      );
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
      setError(
        unknownError instanceof Error ? unknownError.message : 'Unable to hard delete Opportunity.',
      );
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
      ? 'Unsaved'
      : matrixSaveState === 'saving'
        ? 'Saving'
        : matrixSaveState === 'saved'
          ? 'Saved'
          : matrixSaveState === 'conflict'
            ? 'Conflict'
            : matrixSaveState === 'error'
              ? 'Error'
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
                    disabled={matrixSaveState !== 'dirty'}
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
                          value={requirement.text}
                          onChange={(event) =>
                            editRequirementText(requirement.id, event.target.value)
                          }
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

import type {
  CreateOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityDto,
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

const emptyForm: OpportunityFormState = {
  name: '',
  solicitationNumber: '',
  issuingAgency: '',
  description: '',
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
    await refreshOpportunities();
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
              className="matrix-empty"
              aria-label={
                isArchivedWorkspace
                  ? 'Read-only Base Capability Matrix workspace'
                  : 'Base Capability Matrix workspace'
              }
            >
              <p>No requirements yet.</p>
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

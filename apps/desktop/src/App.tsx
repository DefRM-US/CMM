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
  const [openedOpportunity, setOpenedOpportunity] = useState<OpenOpportunityIpcOutput | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<OpportunityFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const refreshOpportunities = useCallback(async () => {
    setOpportunities(await window.cmmApi.listActiveOpportunities());
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
    const opened = await window.cmmApi.openOpportunity({ opportunityId });
    setOpenedOpportunity(opened);
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

  return (
    <div className="app-shell">
      <aside className="opportunity-sidebar" aria-label="Opportunity navigation">
        <div className="sidebar-header">
          <h1>Opportunities</h1>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            New Opportunity
          </Button>
        </div>

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
          {opportunities.length === 0 ? (
            <p className="empty-state">No Opportunities yet</p>
          ) : (
            opportunities.map((opportunity) => (
              <button
                aria-label={`Open ${opportunity.name}`}
                className={
                  openedOpportunity?.opportunity.id === opportunity.id
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
              {openedOpportunity.opportunity.solicitationNumber ? (
                <span className="solicitation-number">
                  {openedOpportunity.opportunity.solicitationNumber}
                </span>
              ) : null}
            </header>
            <section className="matrix-empty" aria-label="Base Capability Matrix workspace">
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

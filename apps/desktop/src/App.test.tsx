import type { OpportunityDto } from '@cmm/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const activeOpportunity: OpportunityDto = {
  id: 'opportunity-active',
  name: 'Arctic Radar Upgrade',
  solicitationNumber: 'RFP-2026-17',
  issuingAgency: 'Naval Systems Command',
  description: null,
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
  lastOpenedAt: null,
  archivedAt: null,
};

const archivedOpportunity: OpportunityDto = {
  ...activeOpportunity,
  id: 'opportunity-archived',
  name: 'Archived Radar Upgrade',
  updatedAt: '2026-05-01T09:10:00.000Z',
  archivedAt: '2026-05-01T09:10:00.000Z',
};

const installCmmApi = (overrides: Partial<Window['cmmApi']> = {}) => {
  const api: Window['cmmApi'] = {
    createOpportunity: vi.fn(),
    listActiveOpportunities: vi.fn(async () => [activeOpportunity]),
    listArchivedOpportunities: vi.fn(async () => [archivedOpportunity]),
    openOpportunity: vi.fn(async ({ opportunityId }) => ({
      opportunity: {
        ...activeOpportunity,
        id: opportunityId,
      },
      baseCapabilityMatrix: {
        opportunityId,
        requirements: [],
      },
    })),
    openArchivedOpportunity: vi.fn(async ({ opportunityId }) => ({
      opportunity: {
        ...archivedOpportunity,
        id: opportunityId,
      },
      baseCapabilityMatrix: {
        opportunityId,
        requirements: [],
      },
    })),
    archiveOpportunity: vi.fn(),
    restoreArchivedOpportunity: vi.fn(),
    hardDeleteArchivedOpportunity: vi.fn(),
    ...overrides,
  };

  Object.defineProperty(window, 'cmmApi', {
    configurable: true,
    value: api,
  });

  return api;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('defaults to active Opportunities and shows archived Opportunities separately', async () => {
    installCmmApi();
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Open Archived Radar Upgrade' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archived' }));

    expect(
      await screen.findByRole('button', { name: 'Open Archived Radar Upgrade' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Open Arctic Radar Upgrade' }),
    ).not.toBeInTheDocument();
  });

  it('archives active Opportunities into a read-only archived workspace', async () => {
    const archivedFromActive = {
      ...activeOpportunity,
      updatedAt: '2026-05-01T09:10:00.000Z',
      archivedAt: '2026-05-01T09:10:00.000Z',
    };
    let active: OpportunityDto[] = [activeOpportunity];
    let archived: OpportunityDto[] = [];
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => active),
      listArchivedOpportunities: vi.fn(async () => archived),
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix: {
          opportunityId: activeOpportunity.id,
          requirements: [],
        },
      })),
      archiveOpportunity: vi.fn(async () => {
        active = [];
        archived = [archivedFromActive];
        return archivedFromActive;
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(await screen.findByRole('button', { name: 'Archive Opportunity' }));

    expect(api.archiveOpportunity).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
    });
    expect(await screen.findByText('Read-only')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Restore Opportunity' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hard delete Opportunity' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open Arctic Radar Upgrade' })).toBeVisible();
  });

  it('restores archived Opportunities to active work', async () => {
    const restoredOpportunity = {
      ...archivedOpportunity,
      archivedAt: null,
      updatedAt: '2026-05-01T09:20:00.000Z',
    };
    let active: OpportunityDto[] = [];
    let archived: OpportunityDto[] = [archivedOpportunity];
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => active),
      listArchivedOpportunities: vi.fn(async () => archived),
      restoreArchivedOpportunity: vi.fn(async () => {
        active = [restoredOpportunity];
        archived = [];
        return restoredOpportunity;
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    await user.click(await screen.findByRole('button', { name: 'Open Archived Radar Upgrade' }));
    expect(await screen.findByText('Read-only')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Restore Opportunity' }));

    expect(api.restoreArchivedOpportunity).toHaveBeenCalledWith({
      opportunityId: archivedOpportunity.id,
    });
    expect(screen.queryByText('Read-only')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Archive Opportunity' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open Archived Radar Upgrade' })).toBeVisible();
  });

  it('requires confirmation before hard-deleting an archived Opportunity', async () => {
    let archived = [archivedOpportunity];
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => []),
      listArchivedOpportunities: vi.fn(async () => archived),
      hardDeleteArchivedOpportunity: vi.fn(async () => {
        archived = [];
        return {
          opportunityId: archivedOpportunity.id,
        };
      }),
    });
    const confirm = vi.spyOn(window, 'confirm');
    confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    await user.click(await screen.findByRole('button', { name: 'Open Archived Radar Upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Hard delete Opportunity' }));

    expect(api.hardDeleteArchivedOpportunity).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open Archived Radar Upgrade' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Hard delete Opportunity' }));

    expect(api.hardDeleteArchivedOpportunity).toHaveBeenCalledWith({
      opportunityId: archivedOpportunity.id,
    });
    expect(await screen.findByText('No archived Opportunities')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Hard delete Opportunity' }),
    ).not.toBeInTheDocument();
  });
});

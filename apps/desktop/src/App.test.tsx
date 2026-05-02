import type { BaseCapabilityMatrixDto, OpportunityDto } from '@cmm/contracts';
import { render, screen, waitFor } from '@testing-library/react';
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

const secondActiveOpportunity: OpportunityDto = {
  ...activeOpportunity,
  id: 'opportunity-second',
  name: 'Harbor Sensor Refresh',
  solicitationNumber: 'RFP-2026-22',
};

const emptyBaseCapabilityMatrix = (opportunityId: string): BaseCapabilityMatrixDto => ({
  opportunityId,
  revision: 0,
  requirements: [],
});

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
      baseCapabilityMatrix: emptyBaseCapabilityMatrix(opportunityId),
    })),
    openArchivedOpportunity: vi.fn(async ({ opportunityId }) => ({
      opportunity: {
        ...archivedOpportunity,
        id: opportunityId,
      },
      baseCapabilityMatrix: emptyBaseCapabilityMatrix(opportunityId),
    })),
    saveBaseCapabilityMatrix: vi.fn(async (matrix) => ({
      ...matrix,
      revision: matrix.revision + 1,
    })),
    exportBaseCapabilityMatrix: vi.fn(async () => ({
      status: 'exported' as const,
      filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
    })),
    archiveOpportunity: vi.fn(),
    restoreArchivedOpportunity: vi.fn(),
    hardDeleteArchivedOpportunity: vi.fn(),
    onWindowCloseRequest: vi.fn(() => () => undefined),
    ...overrides,
  };

  Object.defineProperty(window, 'cmmApi', {
    configurable: true,
    value: api,
  });

  return api;
};

afterEach(() => {
  vi.useRealTimers();
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
        baseCapabilityMatrix: emptyBaseCapabilityMatrix(activeOpportunity.id),
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

  it('flushes dirty Base Capability Matrix edits before archiving an active Opportunity', async () => {
    const archivedFromActive = {
      ...activeOpportunity,
      updatedAt: '2026-05-01T09:10:00.000Z',
      archivedAt: '2026-05-01T09:10:00.000Z',
    };
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    let active: OpportunityDto[] = [activeOpportunity];
    let archived: OpportunityDto[] = [];
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => active),
      listArchivedOpportunities: vi.fn(async () => archived),
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
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
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');
    await user.click(screen.getByRole('button', { name: 'Archive Opportunity' }));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 1,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide IL5 hosting',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
    expect(api.archiveOpportunity).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
    });
    expect(await screen.findByText('Read-only')).toBeVisible();
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

  it('edits, retires, reveals, and saves active Base Capability Matrix Requirements', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 1,
          retiredAt: null,
        },
      ],
    };
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID');
    randomUUID.mockReturnValue('00000000-0000-4000-8000-000000000001');
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 2 text'));
    await user.type(screen.getByLabelText('Requirement 2 text'), 'Operate 24/7 help desk');
    await user.click(screen.getByRole('button', { name: 'Move Requirement 2 up' }));
    await user.click(screen.getByRole('button', { name: 'Indent Requirement 2' }));
    await user.click(screen.getByRole('button', { name: 'Retire Requirement 1.1' }));

    expect(screen.queryByDisplayValue('Provide secure hosting')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show retired Requirements' }));

    expect(screen.getByDisplayValue('Provide secure hosting')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Add Requirement' }));
    await user.type(screen.getByLabelText('Requirement 2 text'), 'Train operators');
    await user.click(screen.getByRole('button', { name: 'Save Matrix' }));

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-2',
          text: 'Operate 24/7 help desk',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        expect.objectContaining({
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 2,
          position: 1,
        }),
        {
          id: '00000000-0000-4000-8000-000000000001',
          text: 'Train operators',
          level: 1,
          position: 2,
          retiredAt: null,
        },
      ],
    });
    expect(await screen.findByText('Saved')).toBeVisible();
  });

  it('autosaves dirty active Base Capability Matrix edits and advances the local revision', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');

    expect(screen.getByText('Dirty')).toBeVisible();

    await new Promise((resolve) => setTimeout(resolve, 600));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 1,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide IL5 hosting',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
    expect(await screen.findByText('Saved')).toBeVisible();

    await user.type(screen.getByLabelText('Requirement 1 text'), ' and DR');
    await new Promise((resolve) => setTimeout(resolve, 600));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenLastCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 2,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide IL5 hosting and DR',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
  });

  it('flushes dirty Base Capability Matrix edits before switching Opportunities', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => [activeOpportunity, secondActiveOpportunity]),
      openOpportunity: vi.fn(async ({ opportunityId }) => ({
        opportunity:
          opportunityId === secondActiveOpportunity.id
            ? secondActiveOpportunity
            : activeOpportunity,
        baseCapabilityMatrix:
          opportunityId === secondActiveOpportunity.id
            ? emptyBaseCapabilityMatrix(secondActiveOpportunity.id)
            : baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');
    await user.click(screen.getByRole('button', { name: 'Open Harbor Sensor Refresh' }));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 1,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide IL5 hosting',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
    expect(await screen.findByText('RFP-2026-22')).toBeVisible();
  });

  it('pauses autosave on stale revision conflicts and blocks guarded actions until recovery', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => [activeOpportunity, secondActiveOpportunity]),
      openOpportunity: vi.fn(async ({ opportunityId }) => ({
        opportunity:
          opportunityId === secondActiveOpportunity.id
            ? secondActiveOpportunity
            : activeOpportunity,
        baseCapabilityMatrix:
          opportunityId === secondActiveOpportunity.id
            ? emptyBaseCapabilityMatrix(secondActiveOpportunity.id)
            : baseCapabilityMatrix,
      })),
      saveBaseCapabilityMatrix: vi.fn(async () => {
        throw new Error('Base Capability Matrix has changed since it was opened.');
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(await screen.findByText('Conflicted')).toBeVisible();
    expect(screen.getByDisplayValue('Provide IL5 hosting')).toBeVisible();
    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Requirement 1 text'), ' with failover');
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Open Harbor Sensor Refresh' }));

    expect(api.openOpportunity).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('Provide IL5 hosting with failover')).toBeVisible();
    expect(
      screen.getByText('Resolve the Base Capability Matrix conflict before continuing.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Discard local draft' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Stay on this Opportunity' })).toBeVisible();
  });

  it('offers retry, stay, and discard recovery choices after a failed guarded flush', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      listActiveOpportunities: vi.fn(async () => [activeOpportunity, secondActiveOpportunity]),
      openOpportunity: vi.fn(async ({ opportunityId }) => ({
        opportunity:
          opportunityId === secondActiveOpportunity.id
            ? secondActiveOpportunity
            : activeOpportunity,
        baseCapabilityMatrix:
          opportunityId === secondActiveOpportunity.id
            ? emptyBaseCapabilityMatrix(secondActiveOpportunity.id)
            : baseCapabilityMatrix,
      })),
      saveBaseCapabilityMatrix: vi.fn(async () => {
        throw new Error('Disk is temporarily unavailable.');
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');
    await user.click(screen.getByRole('button', { name: 'Open Harbor Sensor Refresh' }));

    expect(await screen.findByText('Failed')).toBeVisible();
    expect(screen.getByDisplayValue('Provide IL5 hosting')).toBeVisible();
    expect(api.openOpportunity).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Stay on this Opportunity' }));

    expect(
      screen.queryByText('Save or discard Base Capability Matrix edits before continuing.'),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Provide IL5 hosting')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry save' }));

    await waitFor(() => expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Failed')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Discard local draft' }));

    expect(await screen.findByDisplayValue('Provide secure hosting')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Open Harbor Sensor Refresh' }));

    expect(await screen.findByText('RFP-2026-22')).toBeVisible();
    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledTimes(2);
  });

  it('flushes dirty Base Capability Matrix edits before allowing window close', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const closeRequest: {
      handler: (() => boolean | Promise<boolean>) | null;
    } = {
      handler: null,
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
      onWindowCloseRequest: vi.fn((handler) => {
        closeRequest.handler = handler;
        return () => {
          closeRequest.handler = null;
        };
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');

    if (!closeRequest.handler) {
      throw new Error('Window close handler was not registered.');
    }
    await expect(Promise.resolve(closeRequest.handler())).resolves.toBe(true);

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide IL5 hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });
  });

  it('flushes dirty Base Capability Matrix edits before exporting the workbook', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const calls: string[] = [];
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
      saveBaseCapabilityMatrix: vi.fn(async (matrix) => {
        calls.push('save');
        return {
          ...matrix,
          revision: matrix.revision + 1,
        };
      }),
      exportBaseCapabilityMatrix: vi.fn(async () => {
        calls.push('export');
        return {
          status: 'exported' as const,
          filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
        };
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.type(screen.getByLabelText('Requirement 1 text'), 'Provide IL5 hosting');
    await user.click(screen.getByRole('button', { name: 'Export Workbook' }));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 1,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide IL5 hosting',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
    expect(api.exportBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      includeBlankRequirements: false,
      includeRetiredRequirements: false,
    });
    expect(calls).toEqual(['save', 'export']);
    expect(
      await screen.findByText('Exported Arctic Radar Upgrade - Base Capability Matrix.xlsx'),
    ).toBeVisible();
  });

  it('shows warnings and defaults to excluding blank and retired Requirements before export', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-blank',
          text: '   ',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-retired',
          text: 'Retired draft row',
          level: 1,
          position: 2,
          retiredAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
      exportBaseCapabilityMatrix: vi.fn(async () => ({
        status: 'exported' as const,
        filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Export Workbook' }));

    expect(
      await screen.findByText(
        'Blank Requirements may send draft or empty rows to potential consortium members.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Retired Requirements may reintroduce historical content into the sent baseline.',
      ),
    ).toBeVisible();
    expect(api.exportBaseCapabilityMatrix).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue Export' }));

    expect(api.exportBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      includeBlankRequirements: false,
      includeRetiredRequirements: false,
    });
  });

  it('flushes dirty Base Capability Matrix edits before showing export preflight', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    const calls: string[] = [];
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
      saveBaseCapabilityMatrix: vi.fn(async (matrix) => {
        calls.push('save');
        return {
          ...matrix,
          revision: matrix.revision + 1,
        };
      }),
      exportBaseCapabilityMatrix: vi.fn(async () => {
        calls.push('export');
        return {
          status: 'exported' as const,
          filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
        };
      }),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.clear(screen.getByLabelText('Requirement 1 text'));
    await user.click(screen.getByRole('button', { name: 'Export Workbook' }));

    await waitFor(() =>
      expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
        opportunityId: activeOpportunity.id,
        revision: 1,
        requirements: [
          {
            id: 'requirement-1',
            text: '',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    );
    expect(
      await screen.findByText(
        'Blank Requirements may send draft or empty rows to potential consortium members.',
      ),
    ).toBeVisible();
    expect(api.exportBaseCapabilityMatrix).not.toHaveBeenCalled();
    expect(calls).toEqual(['save']);
  });

  it('exports explicit preflight choices after the user sees the warnings', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-blank',
          text: '',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-retired',
          text: 'Retired draft row',
          level: 1,
          position: 2,
          retiredAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
      exportBaseCapabilityMatrix: vi.fn(async () => ({
        status: 'exported' as const,
        filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByRole('button', { name: 'Export Workbook' }));
    await screen.findByText(
      'Blank Requirements may send draft or empty rows to potential consortium members.',
    );

    await user.click(screen.getByLabelText('Include blank Requirements'));
    await user.click(screen.getByLabelText('Include retired Requirements'));
    await user.click(screen.getByRole('button', { name: 'Continue Export' }));

    expect(api.exportBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      includeBlankRequirements: true,
      includeRetiredRequirements: true,
    });
  });

  it('inserts a new active Requirement from Enter and focuses the new text field', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 1,
          retiredAt: null,
        },
      ],
    };
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID');
    randomUUID.mockReturnValue('00000000-0000-4000-8000-000000000002');
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByLabelText('Requirement 1 text'));
    await user.keyboard('{Enter}');

    const insertedRequirement = await screen.findByLabelText('Requirement 2 text');
    expect(insertedRequirement).toHaveFocus();
    expect(insertedRequirement).toHaveValue('');
    expect(screen.getByLabelText('Requirement 3 text')).toHaveValue('Operate help desk');

    await user.click(screen.getByRole('button', { name: 'Save Matrix' }));

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          text: '',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 2,
          retiredAt: null,
        },
      ],
    });
  });

  it('indents a focused Requirement subtree with Tab and preserves its identity', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-3',
          text: 'Staff first-line support',
          level: 2,
          position: 2,
          retiredAt: null,
        },
        {
          id: 'requirement-4',
          text: 'Train operators',
          level: 1,
          position: 3,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByLabelText('Requirement 2 text'));
    await user.keyboard('{Tab}');

    const indentedRequirement = screen.getByLabelText('Requirement 1.1 text');
    expect(indentedRequirement).toHaveFocus();
    expect(indentedRequirement).toHaveValue('Operate help desk');
    expect(screen.getByLabelText('Requirement 1.1.1 text')).toHaveValue('Staff first-line support');
    expect(screen.getByLabelText('Requirement 2 text')).toHaveValue('Train operators');

    await user.click(screen.getByRole('button', { name: 'Save Matrix' }));

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 2,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-3',
          text: 'Staff first-line support',
          level: 3,
          position: 2,
          retiredAt: null,
        },
        {
          id: 'requirement-4',
          text: 'Train operators',
          level: 1,
          position: 3,
          retiredAt: null,
        },
      ],
    });
  });

  it('outdents a focused Requirement subtree with Shift+Tab', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 2,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-3',
          text: 'Staff first-line support',
          level: 3,
          position: 2,
          retiredAt: null,
        },
        {
          id: 'requirement-4',
          text: 'Train operators',
          level: 1,
          position: 3,
          retiredAt: null,
        },
      ],
    };
    const api = installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByLabelText('Requirement 1.1 text'));
    await user.keyboard('{Shift>}{Tab}{/Shift}');

    const outdentedRequirement = screen.getByLabelText('Requirement 2 text');
    expect(outdentedRequirement).toHaveFocus();
    expect(outdentedRequirement).toHaveValue('Operate help desk');
    expect(screen.getByLabelText('Requirement 2.1 text')).toHaveValue('Staff first-line support');
    expect(screen.getByLabelText('Requirement 3 text')).toHaveValue('Train operators');

    await user.click(screen.getByRole('button', { name: 'Save Matrix' }));

    expect(api.saveBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-3',
          text: 'Staff first-line support',
          level: 2,
          position: 2,
          retiredAt: null,
        },
        {
          id: 'requirement-4',
          text: 'Train operators',
          level: 1,
          position: 3,
          retiredAt: null,
        },
      ],
    });
  });

  it('navigates between Requirement text fields without blocking normal text edits', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 1,
          position: 1,
          retiredAt: null,
        },
        {
          id: 'requirement-3',
          text: 'Train operators',
          level: 1,
          position: 2,
          retiredAt: null,
        },
      ],
    };
    installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByLabelText('Requirement 1 text'));
    await user.keyboard(' with FedRAMP');
    await user.keyboard('{Backspace}');
    await user.keyboard('P');

    expect(screen.getByLabelText('Requirement 1 text')).toHaveValue(
      'Provide secure hosting with FedRAMP',
    );

    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Requirement 2 text')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Requirement 3 text')).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByLabelText('Requirement 2 text')).toHaveFocus();

    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(screen.getByLabelText('Requirement 2 text')).toHaveFocus();
  });

  it('does not trap focus when a keyboard outline command is not valid', async () => {
    const baseCapabilityMatrix: BaseCapabilityMatrixDto = {
      opportunityId: activeOpportunity.id,
      revision: 1,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    };
    installCmmApi({
      openOpportunity: vi.fn(async () => ({
        opportunity: activeOpportunity,
        baseCapabilityMatrix,
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Open Arctic Radar Upgrade' }));
    await user.click(screen.getByLabelText('Requirement 1 text'));
    await user.keyboard('{Shift>}{Tab}{/Shift}');

    expect(screen.getByRole('button', { name: 'Save Matrix' })).toHaveFocus();
  });

  it('loads archived Opportunity matrices in a read-only workspace', async () => {
    installCmmApi({
      openArchivedOpportunity: vi.fn(async () => ({
        opportunity: archivedOpportunity,
        baseCapabilityMatrix: {
          opportunityId: archivedOpportunity.id,
          revision: 1,
          requirements: [
            {
              id: 'requirement-1',
              text: 'Provide secure hosting',
              level: 1,
              position: 0,
              retiredAt: null,
            },
          ],
        },
      })),
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Archived' }));
    await user.click(await screen.findByRole('button', { name: 'Open Archived Radar Upgrade' }));

    expect(await screen.findByDisplayValue('Provide secure hosting')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add Requirement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Matrix' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire Requirement 1' })).not.toBeInTheDocument();
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

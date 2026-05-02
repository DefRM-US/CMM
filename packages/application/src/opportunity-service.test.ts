import type {
  BaseCapabilityMatrix,
  IsoDateTime,
  MemberResponse,
  MemberResponseRow,
  Opportunity,
  OpportunityId,
} from '@cmm/domain';
import { describe, expect, it } from 'vitest';
import {
  type BuildBaseCapabilityMatrixWorkbookInput,
  createOpportunityService,
  type OpportunityRepository,
  type SaveActiveMemberResponseRepositoryInput,
} from './index';

class InMemoryOpportunityRepository implements OpportunityRepository {
  readonly opportunities = new Map<OpportunityId, Opportunity>();
  readonly matrices = new Map<OpportunityId, BaseCapabilityMatrix>();
  readonly memberResponses = new Map<string, MemberResponse>();
  readonly memberResponseRows = new Map<string, MemberResponseRow[]>();
  readonly normalizedMemberNames = new Map<string, string>();

  async saveOpportunity(opportunity: Opportunity): Promise<void> {
    this.opportunities.set(opportunity.id, opportunity);
    this.matrices.set(opportunity.id, {
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [],
    });
  }

  async listActiveOpportunities(): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values()).filter(
      (opportunity) => opportunity.archivedAt === null,
    );
  }

  async listArchivedOpportunities(): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values()).filter(
      (opportunity) => opportunity.archivedAt !== null,
    );
  }

  async findActiveOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt !== null) {
      return null;
    }
    return opportunity;
  }

  async findArchivedOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt === null) {
      return null;
    }
    return opportunity;
  }

  async markOpportunityOpened(
    opportunityId: OpportunityId,
    lastOpenedAt: IsoDateTime,
  ): Promise<Opportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found.');
    }
    const updated = { ...opportunity, lastOpenedAt };
    this.opportunities.set(opportunityId, updated);
    return updated;
  }

  async archiveOpportunity(
    opportunityId: OpportunityId,
    archivedAt: IsoDateTime,
  ): Promise<Opportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt !== null) {
      throw new Error('Opportunity not found.');
    }
    const updated = {
      ...opportunity,
      updatedAt: archivedAt,
      archivedAt,
    };
    this.opportunities.set(opportunityId, updated);
    return updated;
  }

  async restoreArchivedOpportunity(
    opportunityId: OpportunityId,
    restoredAt: IsoDateTime,
  ): Promise<Opportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt === null) {
      throw new Error('Opportunity not found.');
    }
    const updated = {
      ...opportunity,
      updatedAt: restoredAt,
      archivedAt: null,
    };
    this.opportunities.set(opportunityId, updated);
    return updated;
  }

  async hardDeleteArchivedOpportunity(opportunityId: OpportunityId): Promise<void> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt === null) {
      throw new Error('Opportunity not found.');
    }
    this.opportunities.delete(opportunityId);
    this.matrices.delete(opportunityId);
  }

  async loadBaseCapabilityMatrix(opportunityId: OpportunityId): Promise<BaseCapabilityMatrix> {
    const matrix = this.matrices.get(opportunityId);
    if (!matrix) {
      throw new Error('Base Capability Matrix not found.');
    }
    return matrix;
  }

  async saveBaseCapabilityMatrix(matrix: BaseCapabilityMatrix): Promise<BaseCapabilityMatrix> {
    const current = this.matrices.get(matrix.opportunityId);
    if (!current) {
      throw new Error('Base Capability Matrix not found.');
    }
    const saved = {
      ...matrix,
      revision: current.revision + 1,
    };
    this.matrices.set(matrix.opportunityId, saved);
    return saved;
  }

  async listActiveMemberResponses(opportunityId: OpportunityId): Promise<MemberResponse[]> {
    return Array.from(this.memberResponses.values()).filter(
      (memberResponse) =>
        memberResponse.opportunityId === opportunityId && memberResponse.archivedAt === null,
    );
  }

  async loadMemberResponseRows(memberResponseId: string): Promise<MemberResponseRow[]> {
    return this.memberResponseRows.get(memberResponseId) ?? [];
  }

  async saveActiveMemberResponse(
    input: SaveActiveMemberResponseRepositoryInput,
  ): Promise<MemberResponse> {
    for (const [memberResponseId, memberResponse] of this.memberResponses) {
      if (
        memberResponse.opportunityId === input.memberResponse.opportunityId &&
        memberResponse.archivedAt === null &&
        this.normalizedMemberNames.get(memberResponseId) === input.normalizedMemberName
      ) {
        this.memberResponses.set(memberResponseId, {
          ...memberResponse,
          archivedAt: input.archivedAt,
          evaluationState: null,
        });
      }
    }

    this.memberResponses.set(input.memberResponse.id, input.memberResponse);
    this.normalizedMemberNames.set(input.memberResponse.id, input.normalizedMemberName);
    this.memberResponseRows.set(input.memberResponse.id, input.rows);
    return input.memberResponse;
  }
}

const createClock = (timestamps: IsoDateTime[]) => {
  let index = 0;
  return {
    now(): IsoDateTime {
      const timestamp = timestamps[index];
      if (!timestamp) {
        throw new Error('No timestamp configured for test clock.');
      }
      index += 1;
      return timestamp;
    },
  };
};

describe('OpportunityService', () => {
  it('creates, lists, and opens an Opportunity with an empty Base Capability Matrix', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:05:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({
      name: '  Arctic Radar Upgrade  ',
      solicitationNumber: '  RFP-2026-17  ',
      issuingAgency: '  Naval Systems Command  ',
      description: '  Sensor modernization pursuit  ',
    });

    expect(created).toEqual({
      id: 'opportunity-1',
      name: 'Arctic Radar Upgrade',
      solicitationNumber: 'RFP-2026-17',
      issuingAgency: 'Naval Systems Command',
      description: 'Sensor modernization pursuit',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      lastOpenedAt: null,
      archivedAt: null,
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([created]);

    const opened = await service.openOpportunity({ opportunityId: created.id });

    expect(opened).toEqual({
      opportunity: {
        ...created,
        lastOpenedAt: '2026-05-01T09:05:00.000Z',
      },
      baseCapabilityMatrix: {
        opportunityId: 'opportunity-1',
        revision: 0,
        requirements: [],
      },
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([opened.opportunity]);
  });

  it('archives an active Opportunity into the archived Opportunity list', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:10:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({
      name: 'Arctic Radar Upgrade',
    });

    const archived = await service.archiveOpportunity({ opportunityId: created.id });

    expect(archived).toEqual({
      ...created,
      updatedAt: '2026-05-01T09:10:00.000Z',
      archivedAt: '2026-05-01T09:10:00.000Z',
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([]);
    await expect(service.listArchivedOpportunities()).resolves.toEqual([archived]);
  });

  it('restores an archived Opportunity with prior data intact', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock([
        '2026-05-01T09:00:00.000Z',
        '2026-05-01T09:05:00.000Z',
        '2026-05-01T09:10:00.000Z',
        '2026-05-01T09:15:00.000Z',
      ]),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({
      name: 'Arctic Radar Upgrade',
      solicitationNumber: 'RFP-2026-17',
      issuingAgency: 'Naval Systems Command',
      description: 'Sensor modernization pursuit',
    });
    const opened = await service.openOpportunity({ opportunityId: created.id });
    const archived = await service.archiveOpportunity({ opportunityId: created.id });

    const restored = await service.restoreArchivedOpportunity({ opportunityId: archived.id });

    expect(restored).toEqual({
      ...opened.opportunity,
      updatedAt: '2026-05-01T09:15:00.000Z',
      archivedAt: null,
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([restored]);
    await expect(service.listArchivedOpportunities()).resolves.toEqual([]);
  });

  it('opens an archived Opportunity for read-only inspection without marking it opened', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock([
        '2026-05-01T09:00:00.000Z',
        '2026-05-01T09:05:00.000Z',
        '2026-05-01T09:10:00.000Z',
      ]),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    const opened = await service.openOpportunity({ opportunityId: created.id });
    const archived = await service.archiveOpportunity({ opportunityId: created.id });

    await expect(service.openOpportunity({ opportunityId: archived.id })).rejects.toThrow(
      'Opportunity not found.',
    );
    await expect(service.openArchivedOpportunity({ opportunityId: archived.id })).resolves.toEqual({
      opportunity: {
        ...archived,
        lastOpenedAt: opened.opportunity.lastOpenedAt,
      },
      baseCapabilityMatrix: {
        opportunityId: 'opportunity-1',
        revision: 0,
        requirements: [],
      },
    });
  });

  it('saves and reopens an active Opportunity Base Capability Matrix with stable Requirement IDs', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:05:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });

    const saved = await service.saveBaseCapabilityMatrix({
      opportunityId: created.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 3,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Operate help desk',
          level: 2,
          position: 8,
          retiredAt: null,
        },
      ],
    });

    expect(saved).toEqual({
      opportunityId: created.id,
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
      ],
    });

    const reopened = await service.openOpportunity({ opportunityId: created.id });

    expect(reopened.baseCapabilityMatrix).toEqual(saved);
  });

  it('rejects stale Base Capability Matrix saves', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.saveBaseCapabilityMatrix({
      opportunityId: created.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });

    await expect(
      service.saveBaseCapabilityMatrix({
        opportunityId: created.id,
        revision: 0,
        requirements: [
          {
            id: 'requirement-1',
            text: 'Provide secure hosting with stale revision',
            level: 1,
            position: 0,
            retiredAt: null,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'baseMatrix.revisionConflict',
    });
  });

  it('rejects Base Capability Matrix saves for archived Opportunities', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:10:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.archiveOpportunity({ opportunityId: created.id });

    await expect(
      service.saveBaseCapabilityMatrix({
        opportunityId: created.id,
        revision: 0,
        requirements: [],
      }),
    ).rejects.toThrow('Opportunity not found.');
  });

  it('exports the active Opportunity Base Capability Matrix through the workbook builder', async () => {
    const repository = new InMemoryOpportunityRepository();
    const builtWorkbooks: BuildBaseCapabilityMatrixWorkbookInput[] = [];
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-02T10:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
      workbookBuilder: {
        async buildBaseCapabilityMatrixWorkbook(input) {
          builtWorkbooks.push(input);
          return new Uint8Array([1, 2, 3]);
        },
      },
    });

    const opportunity = await service.createOpportunity({
      name: 'Arctic Radar Upgrade',
      solicitationNumber: 'RFP-2026-17',
      issuingAgency: 'Naval Systems Command',
    });
    const saved = await service.saveBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });

    await expect(
      service.exportBaseCapabilityMatrix({
        opportunityId: opportunity.id,
        includeBlankRequirements: false,
        includeRetiredRequirements: false,
      }),
    ).resolves.toEqual({
      workbook: new Uint8Array([1, 2, 3]),
      suggestedFilename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      exportTimestamp: '2026-05-02T10:00:00.000Z',
    });
    expect(builtWorkbooks).toEqual([
      {
        opportunity,
        exportTimestamp: '2026-05-02T10:00:00.000Z',
        requirements: saved.requirements,
        exportChoices: {
          includeBlankRequirements: false,
          includeRetiredRequirements: false,
        },
      },
    ]);
  });

  it('passes Base Capability Matrix export choices to the workbook builder', async () => {
    const repository = new InMemoryOpportunityRepository();
    const builtWorkbooks: BuildBaseCapabilityMatrixWorkbookInput[] = [];
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-02T10:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
      workbookBuilder: {
        async buildBaseCapabilityMatrixWorkbook(input) {
          builtWorkbooks.push(input);
          return new Uint8Array([1, 2, 3]);
        },
      },
    });

    const opportunity = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.saveBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });

    await service.exportBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      includeBlankRequirements: true,
      includeRetiredRequirements: false,
    });

    expect(builtWorkbooks[0]).toMatchObject({
      exportChoices: {
        includeBlankRequirements: true,
        includeRetiredRequirements: false,
      },
    });
  });

  it('previews a clean Member Response import by mapping hidden Requirement IDs to active and retired Requirements', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const opportunity = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.saveBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-active',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-retired',
          text: 'Retired draft Requirement',
          level: 1,
          position: 1,
          retiredAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    });

    await expect(
      service.previewMemberResponseImport({
        opportunityId: opportunity.id,
        sourceFilename: 'Polar Systems response.xlsx',
        parsedWorkbook: {
          metadata: {
            workbookFormatVersion: '1',
            opportunityId: opportunity.id,
            exportTimestamp: '2026-05-02T10:00:00.000Z',
          },
          workbookTitle: 'Arctic Radar Upgrade',
          memberName: 'Polar Systems LLC',
          rows: [
            {
              requirementId: 'requirement-active',
              requirementNumber: '99',
              requirementText: 'Edited visible text',
              capabilityScore: 3,
              pastPerformanceReference: 'Hosted IL5 workloads',
              responseComment: 'Available immediately',
            },
            {
              requirementId: 'requirement-retired',
              requirementNumber: '100',
              requirementText: 'Edited retired text',
              capabilityScore: 1,
              pastPerformanceReference: 'Legacy support',
              responseComment: '',
            },
          ],
        },
      }),
    ).resolves.toEqual({
      opportunityId: opportunity.id,
      sourceFilename: 'Polar Systems response.xlsx',
      workbookTitle: 'Arctic Radar Upgrade',
      suggestedMemberName: 'Polar Systems LLC',
      rows: [
        {
          requirementId: 'requirement-active',
          requirementNumber: '99',
          requirementText: 'Edited visible text',
          requirementRetiredAt: null,
          capabilityScore: 3,
          pastPerformanceReference: 'Hosted IL5 workloads',
          responseComment: 'Available immediately',
        },
        {
          requirementId: 'requirement-retired',
          requirementNumber: '100',
          requirementText: 'Edited retired text',
          requirementRetiredAt: '2026-05-01T10:00:00.000Z',
          capabilityScore: 1,
          pastPerformanceReference: 'Legacy support',
          responseComment: '',
        },
      ],
    });
  });

  it('saves a reviewed Member Response using the confirmed Potential Consortium Member name', async () => {
    const repository = new InMemoryOpportunityRepository();
    const idValues = ['opportunity-1', 'member-response-1', 'member-response-row-1'];
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-02T11:00:00.000Z']),
      ids: {
        next: () => {
          const id = idValues.shift();
          if (!id) {
            throw new Error('No ID configured for test.');
          }
          return id;
        },
      },
    });

    const opportunity = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.saveBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });
    const preview = await service.previewMemberResponseImport({
      opportunityId: opportunity.id,
      sourceFilename: 'Polar Systems response.xlsx',
      parsedWorkbook: {
        metadata: {
          workbookFormatVersion: '1',
          opportunityId: opportunity.id,
          exportTimestamp: '2026-05-02T10:00:00.000Z',
        },
        workbookTitle: 'Arctic Radar Upgrade',
        memberName: 'Polar Systems LLC',
        rows: [
          {
            requirementId: 'requirement-1',
            requirementNumber: '1',
            requirementText: 'Provide secure hosting',
            capabilityScore: 3,
            pastPerformanceReference: 'Hosted IL5 workloads\nSupported SOC operations',
            responseComment: 'Prime experience\nAvailable immediately',
          },
        ],
      },
    });

    await expect(
      service.saveMemberResponseImport({
        ...preview,
        memberName: ' Polar Systems International ',
      }),
    ).resolves.toEqual({
      id: 'member-response-1',
      opportunityId: opportunity.id,
      memberName: 'Polar Systems International',
      sourceFilename: 'Polar Systems response.xlsx',
      workbookTitle: 'Arctic Radar Upgrade',
      importedAt: '2026-05-02T11:00:00.000Z',
      archivedAt: null,
      evaluationState: 'candidate',
    });
    expect(repository.memberResponseRows.get('member-response-1')).toEqual([
      {
        id: 'member-response-row-1',
        memberResponseId: 'member-response-1',
        requirementId: 'requirement-1',
        requirementNumber: '1',
        requirementText: 'Provide secure hosting',
        capabilityScore: 3,
        pastPerformanceReference: 'Hosted IL5 workloads\nSupported SOC operations',
        responseComment: 'Prime experience\nAvailable immediately',
        position: 0,
      },
    ]);
  });

  it('rejects Member Response workbooks with no usable response rows', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const opportunity = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    await service.saveBaseCapabilityMatrix({
      opportunityId: opportunity.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
      ],
    });

    await expect(
      service.previewMemberResponseImport({
        opportunityId: opportunity.id,
        sourceFilename: 'empty response.xlsx',
        parsedWorkbook: {
          metadata: {
            workbookFormatVersion: '1',
            opportunityId: opportunity.id,
            exportTimestamp: '2026-05-02T10:00:00.000Z',
          },
          workbookTitle: 'Arctic Radar Upgrade',
          memberName: 'Polar Systems LLC',
          rows: [
            {
              requirementId: 'requirement-1',
              requirementNumber: '1',
              requirementText: 'Provide secure hosting',
              capabilityScore: null,
              pastPerformanceReference: '   ',
              responseComment: '',
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      code: 'memberResponse.noUsableRows',
    });
  });

  it('hard-deletes an archived Opportunity', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:10:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });
    const archived = await service.archiveOpportunity({ opportunityId: created.id });

    await expect(
      service.hardDeleteArchivedOpportunity({ opportunityId: archived.id }),
    ).resolves.toBeUndefined();

    await expect(service.listActiveOpportunities()).resolves.toEqual([]);
    await expect(service.listArchivedOpportunities()).resolves.toEqual([]);
  });

  it('rejects hard delete for an active Opportunity', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({ name: 'Arctic Radar Upgrade' });

    await expect(
      service.hardDeleteArchivedOpportunity({ opportunityId: created.id }),
    ).rejects.toThrow('Opportunity not found.');
    await expect(service.listActiveOpportunities()).resolves.toEqual([created]);
  });
});

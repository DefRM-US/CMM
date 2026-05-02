import type {
  BaseCapabilityMatrix,
  CreateOpportunityInput,
  IsoDateTime,
  Opportunity,
  OpportunityId,
  Requirement,
} from '@cmm/domain';
import {
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeRequirementPositions,
} from '@cmm/domain';

export type Clock = {
  now(): IsoDateTime;
};

export type IdGenerator = {
  next(): string;
};

export type OpportunityRepository = {
  saveOpportunity(opportunity: Opportunity): Promise<void>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  listArchivedOpportunities(): Promise<Opportunity[]>;
  findActiveOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null>;
  findArchivedOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null>;
  markOpportunityOpened(
    opportunityId: OpportunityId,
    lastOpenedAt: IsoDateTime,
  ): Promise<Opportunity>;
  archiveOpportunity(opportunityId: OpportunityId, archivedAt: IsoDateTime): Promise<Opportunity>;
  restoreArchivedOpportunity(
    opportunityId: OpportunityId,
    restoredAt: IsoDateTime,
  ): Promise<Opportunity>;
  hardDeleteArchivedOpportunity(opportunityId: OpportunityId): Promise<void>;
  loadBaseCapabilityMatrix(opportunityId: OpportunityId): Promise<BaseCapabilityMatrix>;
  saveBaseCapabilityMatrix(matrix: BaseCapabilityMatrix): Promise<BaseCapabilityMatrix>;
};

export type OpenOpportunityInput = {
  opportunityId: OpportunityId;
};

export type ArchiveOpportunityInput = {
  opportunityId: OpportunityId;
};

export type RestoreArchivedOpportunityInput = {
  opportunityId: OpportunityId;
};

export type HardDeleteArchivedOpportunityInput = {
  opportunityId: OpportunityId;
};

export type SaveBaseCapabilityMatrixInput = {
  opportunityId: OpportunityId;
  revision: number;
  requirements: Requirement[];
};

export type BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements: boolean;
  includeRetiredRequirements: boolean;
};

export type ExportBaseCapabilityMatrixInput = {
  opportunityId: OpportunityId;
} & BaseCapabilityMatrixExportChoices;

export type OpenOpportunityResult = {
  opportunity: Opportunity;
  baseCapabilityMatrix: BaseCapabilityMatrix;
};

export type BuildBaseCapabilityMatrixWorkbookInput = {
  opportunity: Opportunity;
  exportTimestamp: IsoDateTime;
  requirements: Requirement[];
  exportChoices: BaseCapabilityMatrixExportChoices;
};

export type BaseCapabilityMatrixWorkbookBuilder = {
  buildBaseCapabilityMatrixWorkbook(
    input: BuildBaseCapabilityMatrixWorkbookInput,
  ): Promise<Uint8Array>;
};

export type ExportBaseCapabilityMatrixResult = {
  workbook: Uint8Array;
  suggestedFilename: string;
  exportTimestamp: IsoDateTime;
};

export type OpportunityService = {
  createOpportunity(input: CreateOpportunityInput): Promise<Opportunity>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  listArchivedOpportunities(): Promise<Opportunity[]>;
  openOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  openArchivedOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  saveBaseCapabilityMatrix(input: SaveBaseCapabilityMatrixInput): Promise<BaseCapabilityMatrix>;
  exportBaseCapabilityMatrix(
    input: ExportBaseCapabilityMatrixInput,
  ): Promise<ExportBaseCapabilityMatrixResult>;
  archiveOpportunity(input: ArchiveOpportunityInput): Promise<Opportunity>;
  restoreArchivedOpportunity(input: RestoreArchivedOpportunityInput): Promise<Opportunity>;
  hardDeleteArchivedOpportunity(input: HardDeleteArchivedOpportunityInput): Promise<void>;
};

export type CreateOpportunityServiceOptions = {
  repository: OpportunityRepository;
  clock: Clock;
  ids: IdGenerator;
  workbookBuilder?: BaseCapabilityMatrixWorkbookBuilder;
};

export class ApplicationError extends Error {
  constructor(
    readonly code:
      | 'opportunity.nameRequired'
      | 'opportunity.notFound'
      | 'baseMatrix.revisionConflict',
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const createOpportunityService = ({
  repository,
  clock,
  ids,
  workbookBuilder,
}: CreateOpportunityServiceOptions): OpportunityService => ({
  async createOpportunity(input) {
    const name = normalizeRequiredText(input.name);
    if (!name) {
      throw new ApplicationError('opportunity.nameRequired', 'Opportunity name is required.');
    }

    const timestamp = clock.now();
    const opportunity: Opportunity = {
      id: ids.next(),
      name,
      solicitationNumber: normalizeOptionalText(input.solicitationNumber),
      issuingAgency: normalizeOptionalText(input.issuingAgency),
      description: normalizeOptionalText(input.description),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: null,
      archivedAt: null,
    };

    await repository.saveOpportunity(opportunity);
    return opportunity;
  },

  listActiveOpportunities() {
    return repository.listActiveOpportunities();
  },

  listArchivedOpportunities() {
    return repository.listArchivedOpportunities();
  },

  async openOpportunity(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const opportunity = await repository.markOpportunityOpened(input.opportunityId, clock.now());
    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(opportunity.id);
    return { opportunity, baseCapabilityMatrix };
  },

  async openArchivedOpportunity(input) {
    const opportunity = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(opportunity.id);
    return { opportunity, baseCapabilityMatrix };
  },

  async saveBaseCapabilityMatrix(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const currentMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    if (currentMatrix.revision !== input.revision) {
      throw new ApplicationError(
        'baseMatrix.revisionConflict',
        'Base Capability Matrix has changed since it was opened.',
      );
    }

    return repository.saveBaseCapabilityMatrix({
      opportunityId: input.opportunityId,
      revision: input.revision,
      requirements: normalizeRequirementPositions(input.requirements),
    });
  },

  async exportBaseCapabilityMatrix(input) {
    const opportunity = await repository.findActiveOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }
    if (!workbookBuilder) {
      throw new Error('Base Capability Matrix workbook builder is not configured.');
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    const exportTimestamp = clock.now();
    const workbook = await workbookBuilder.buildBaseCapabilityMatrixWorkbook({
      opportunity,
      exportTimestamp,
      requirements: baseCapabilityMatrix.requirements,
      exportChoices: {
        includeBlankRequirements: input.includeBlankRequirements,
        includeRetiredRequirements: input.includeRetiredRequirements,
      },
    });

    return {
      workbook,
      suggestedFilename: `${toWorkbookFilenameStem(opportunity.name)} - Base Capability Matrix.xlsx`,
      exportTimestamp,
    };
  },

  async archiveOpportunity(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    return repository.archiveOpportunity(input.opportunityId, clock.now());
  },

  async restoreArchivedOpportunity(input) {
    const existing = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    return repository.restoreArchivedOpportunity(input.opportunityId, clock.now());
  },

  async hardDeleteArchivedOpportunity(input) {
    const existing = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    await repository.hardDeleteArchivedOpportunity(input.opportunityId);
  },
});

const invalidFilenameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

const sanitizeFilenameCharacter = (character: string): string =>
  invalidFilenameCharacters.has(character) || character.charCodeAt(0) < 32 ? ' ' : character;

const toWorkbookFilenameStem = (name: string): string => {
  const stem = name.split('').map(sanitizeFilenameCharacter).join('').replace(/\s+/g, ' ').trim();
  return stem.length > 0 ? stem : 'Opportunity';
};

import type {
  BaseCapabilityMatrix,
  CreateOpportunityInput,
  IsoDateTime,
  Opportunity,
  OpportunityId,
} from '@cmm/domain';
import { normalizeOptionalText, normalizeRequiredText } from '@cmm/domain';

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

export type OpenOpportunityResult = {
  opportunity: Opportunity;
  baseCapabilityMatrix: BaseCapabilityMatrix;
};

export type OpportunityService = {
  createOpportunity(input: CreateOpportunityInput): Promise<Opportunity>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  listArchivedOpportunities(): Promise<Opportunity[]>;
  openOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  openArchivedOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  archiveOpportunity(input: ArchiveOpportunityInput): Promise<Opportunity>;
  restoreArchivedOpportunity(input: RestoreArchivedOpportunityInput): Promise<Opportunity>;
  hardDeleteArchivedOpportunity(input: HardDeleteArchivedOpportunityInput): Promise<void>;
};

export type CreateOpportunityServiceOptions = {
  repository: OpportunityRepository;
  clock: Clock;
  ids: IdGenerator;
};

export class ApplicationError extends Error {
  constructor(
    readonly code: 'opportunity.nameRequired' | 'opportunity.notFound',
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
    return {
      opportunity,
      baseCapabilityMatrix: {
        opportunityId: opportunity.id,
        requirements: [],
      },
    };
  },

  async openArchivedOpportunity(input) {
    const opportunity = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    return {
      opportunity,
      baseCapabilityMatrix: {
        opportunityId: opportunity.id,
        requirements: [],
      },
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

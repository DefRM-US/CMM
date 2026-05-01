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
  findActiveOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null>;
  markOpportunityOpened(
    opportunityId: OpportunityId,
    lastOpenedAt: IsoDateTime,
  ): Promise<Opportunity>;
};

export type OpenOpportunityInput = {
  opportunityId: OpportunityId;
};

export type OpenOpportunityResult = {
  opportunity: Opportunity;
  baseCapabilityMatrix: BaseCapabilityMatrix;
};

export type OpportunityService = {
  createOpportunity(input: CreateOpportunityInput): Promise<Opportunity>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  openOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
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
});

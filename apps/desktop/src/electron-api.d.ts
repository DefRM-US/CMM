import type {
  CreateOpportunityIpcInput,
  HardDeleteArchivedOpportunityIpcOutput,
  OpenOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityLifecycleIpcInput,
  OpportunityDto,
} from '@cmm/contracts';

export interface CmmApi {
  createOpportunity(input: CreateOpportunityIpcInput): Promise<OpportunityDto>;
  listActiveOpportunities(): Promise<OpportunityDto[]>;
  listArchivedOpportunities(): Promise<OpportunityDto[]>;
  openOpportunity(input: OpenOpportunityIpcInput): Promise<OpenOpportunityIpcOutput>;
  openArchivedOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpenOpportunityIpcOutput>;
  archiveOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpportunityDto>;
  restoreArchivedOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpportunityDto>;
  hardDeleteArchivedOpportunity(
    input: OpportunityLifecycleIpcInput,
  ): Promise<HardDeleteArchivedOpportunityIpcOutput>;
}

declare global {
  interface Window {
    cmmApi: CmmApi;
  }
}

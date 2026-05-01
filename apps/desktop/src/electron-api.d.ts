import type {
  CreateOpportunityIpcInput,
  BaseCapabilityMatrixDto,
  HardDeleteArchivedOpportunityIpcOutput,
  OpenOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityLifecycleIpcInput,
  OpportunityDto,
  SaveBaseCapabilityMatrixIpcInput,
} from '@cmm/contracts';

export interface CmmApi {
  createOpportunity(input: CreateOpportunityIpcInput): Promise<OpportunityDto>;
  listActiveOpportunities(): Promise<OpportunityDto[]>;
  listArchivedOpportunities(): Promise<OpportunityDto[]>;
  openOpportunity(input: OpenOpportunityIpcInput): Promise<OpenOpportunityIpcOutput>;
  openArchivedOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpenOpportunityIpcOutput>;
  saveBaseCapabilityMatrix(
    input: SaveBaseCapabilityMatrixIpcInput,
  ): Promise<BaseCapabilityMatrixDto>;
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

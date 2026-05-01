import type {
  CreateOpportunityIpcInput,
  OpenOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityDto,
} from '@cmm/contracts';

export interface CmmApi {
  createOpportunity(input: CreateOpportunityIpcInput): Promise<OpportunityDto>;
  listActiveOpportunities(): Promise<OpportunityDto[]>;
  openOpportunity(input: OpenOpportunityIpcInput): Promise<OpenOpportunityIpcOutput>;
}

declare global {
  interface Window {
    cmmApi: CmmApi;
  }
}

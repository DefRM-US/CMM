import type {
  CreateOpportunityIpcInput,
  BaseCapabilityMatrixDto,
  HardDeleteArchivedOpportunityIpcOutput,
  ExportBaseCapabilityMatrixIpcInput,
  ExportBaseCapabilityMatrixIpcOutput,
  MemberResponseDto,
  OpenOpportunityIpcInput,
  OpenOpportunityIpcOutput,
  OpportunityLifecycleIpcInput,
  OpportunityDto,
  SaveBaseCapabilityMatrixIpcInput,
  SaveMemberResponseImportIpcInput,
  SelectMemberResponseWorkbookForImportIpcInput,
  SelectMemberResponseWorkbookForImportIpcOutput,
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
  exportBaseCapabilityMatrix(
    input: ExportBaseCapabilityMatrixIpcInput,
  ): Promise<ExportBaseCapabilityMatrixIpcOutput>;
  selectMemberResponseWorkbookForImport(
    input: SelectMemberResponseWorkbookForImportIpcInput,
  ): Promise<SelectMemberResponseWorkbookForImportIpcOutput>;
  saveMemberResponseImport(input: SaveMemberResponseImportIpcInput): Promise<MemberResponseDto>;
  archiveOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpportunityDto>;
  restoreArchivedOpportunity(input: OpportunityLifecycleIpcInput): Promise<OpportunityDto>;
  hardDeleteArchivedOpportunity(
    input: OpportunityLifecycleIpcInput,
  ): Promise<HardDeleteArchivedOpportunityIpcOutput>;
  onWindowCloseRequest(handler: () => boolean | Promise<boolean>): () => void;
}

declare global {
  interface Window {
    cmmApi: CmmApi;
  }
}

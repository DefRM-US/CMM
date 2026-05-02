import { z } from 'zod';

const isoDateTimeSchema = z.string().min(1);
const nullableTextSchema = z.string().nullable();
const capabilityScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

const opportunitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  solicitationNumber: nullableTextSchema,
  issuingAgency: nullableTextSchema,
  description: nullableTextSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  lastOpenedAt: isoDateTimeSchema.nullable(),
  archivedAt: isoDateTimeSchema.nullable(),
});

const createOpportunityInputSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, 'Opportunity name is required.'),
  solicitationNumber: nullableTextSchema.optional(),
  issuingAgency: nullableTextSchema.optional(),
  description: nullableTextSchema.optional(),
});

const opportunityIdInputSchema = z.object({
  opportunityId: z
    .string()
    .refine((value) => value.trim().length > 0, 'Opportunity ID is required.'),
});

const exportBaseCapabilityMatrixInputSchema = opportunityIdInputSchema.extend({
  includeBlankRequirements: z.boolean(),
  includeRetiredRequirements: z.boolean(),
});

const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  level: z.number().int().min(1),
  position: z.number().int().min(0),
  retiredAt: isoDateTimeSchema.nullable(),
});

const baseCapabilityMatrixSchema = z.object({
  opportunityId: z.string().min(1),
  revision: z.number().int().min(0),
  requirements: z.array(requirementSchema),
});

const memberResponseImportPreviewRowSchema = z.object({
  requirementId: z.string().min(1),
  requirementNumber: z.string(),
  requirementText: z.string(),
  requirementRetiredAt: isoDateTimeSchema.nullable(),
  capabilityScore: capabilityScoreSchema.nullable(),
  pastPerformanceReference: z.string(),
  responseComment: z.string(),
});

const memberResponseImportPreviewSchema = z.object({
  opportunityId: z.string().min(1),
  sourceFilename: nullableTextSchema,
  workbookTitle: nullableTextSchema,
  suggestedMemberName: z.string(),
  rows: z.array(memberResponseImportPreviewRowSchema).min(1),
});

const selectMemberResponseWorkbookForImportOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('readyForReview'),
    preview: memberResponseImportPreviewSchema,
  }),
  z.object({
    status: z.literal('canceled'),
    preview: z.null(),
  }),
  z.object({
    status: z.literal('rejected'),
    error: z.object({
      code: z.literal('memberResponse.noUsableRows'),
    }),
    preview: z.null(),
  }),
]);

const saveMemberResponseImportInputSchema = memberResponseImportPreviewSchema.extend({
  memberName: z
    .string()
    .refine((value) => value.trim().length > 0, 'Potential Consortium Member name is required.'),
});

const memberResponseSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  memberName: z.string().min(1),
  sourceFilename: nullableTextSchema,
  workbookTitle: nullableTextSchema,
  importedAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema.nullable(),
  evaluationState: z.enum(['candidate', 'selected', 'hidden']).nullable(),
});

const openOpportunityOutputSchema = z.object({
  opportunity: opportunitySchema,
  baseCapabilityMatrix: baseCapabilityMatrixSchema,
});

const hardDeleteArchivedOpportunityOutputSchema = z.object({
  opportunityId: z.string().min(1),
});

const exportBaseCapabilityMatrixOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('exported'),
    filename: z.string().min(1),
  }),
  z.object({
    status: z.literal('canceled'),
    filename: z.null(),
  }),
]);

const windowCloseRequestSchema = z.object({
  requestId: z.string().min(1),
});

const windowCloseResponseSchema = z.object({
  requestId: z.string().min(1),
  canClose: z.boolean(),
});

export type OpportunityDto = z.infer<typeof opportunitySchema>;
export type RequirementDto = z.infer<typeof requirementSchema>;
export type BaseCapabilityMatrixDto = z.infer<typeof baseCapabilityMatrixSchema>;
export type CreateOpportunityIpcInput = z.infer<typeof createOpportunityInputSchema>;
export type OpenOpportunityIpcInput = z.infer<typeof opportunityIdInputSchema>;
export type OpenOpportunityIpcOutput = z.infer<typeof openOpportunityOutputSchema>;
export type OpportunityLifecycleIpcInput = z.infer<typeof opportunityIdInputSchema>;
export type SaveBaseCapabilityMatrixIpcInput = z.infer<typeof baseCapabilityMatrixSchema>;
export type ExportBaseCapabilityMatrixIpcInput = z.infer<
  typeof exportBaseCapabilityMatrixInputSchema
>;
export type ExportBaseCapabilityMatrixIpcOutput = z.infer<
  typeof exportBaseCapabilityMatrixOutputSchema
>;
export type MemberResponseImportPreviewDto = z.infer<typeof memberResponseImportPreviewSchema>;
export type SelectMemberResponseWorkbookForImportIpcInput = z.infer<
  typeof opportunityIdInputSchema
>;
export type SelectMemberResponseWorkbookForImportIpcOutput = z.infer<
  typeof selectMemberResponseWorkbookForImportOutputSchema
>;
export type SaveMemberResponseImportIpcInput = z.infer<typeof saveMemberResponseImportInputSchema>;
export type MemberResponseDto = z.infer<typeof memberResponseSchema>;
export type HardDeleteArchivedOpportunityIpcOutput = z.infer<
  typeof hardDeleteArchivedOpportunityOutputSchema
>;
export type WindowCloseRequestDto = z.infer<typeof windowCloseRequestSchema>;
export type WindowCloseResponseDto = z.infer<typeof windowCloseResponseSchema>;

export type IpcContract<Input, Output> = {
  channel: string;
  inputSchema: z.ZodType<Input>;
  outputSchema: z.ZodType<Output>;
};

const defineContract = <Input, Output>(
  contract: IpcContract<Input, Output>,
): IpcContract<Input, Output> => contract;

export const cmmIpcContracts = {
  createOpportunity: defineContract({
    channel: 'cmm:opportunities:create',
    inputSchema: createOpportunityInputSchema,
    outputSchema: opportunitySchema,
  }),
  listActiveOpportunities: defineContract({
    channel: 'cmm:opportunities:list-active',
    inputSchema: z.undefined(),
    outputSchema: z.array(opportunitySchema),
  }),
  listArchivedOpportunities: defineContract({
    channel: 'cmm:opportunities:list-archived',
    inputSchema: z.undefined(),
    outputSchema: z.array(opportunitySchema),
  }),
  openOpportunity: defineContract({
    channel: 'cmm:opportunities:open',
    inputSchema: opportunityIdInputSchema,
    outputSchema: openOpportunityOutputSchema,
  }),
  openArchivedOpportunity: defineContract({
    channel: 'cmm:opportunities:open-archived',
    inputSchema: opportunityIdInputSchema,
    outputSchema: openOpportunityOutputSchema,
  }),
  saveBaseCapabilityMatrix: defineContract({
    channel: 'cmm:base-matrices:save',
    inputSchema: baseCapabilityMatrixSchema,
    outputSchema: baseCapabilityMatrixSchema,
  }),
  exportBaseCapabilityMatrix: defineContract({
    channel: 'cmm:base-matrices:export',
    inputSchema: exportBaseCapabilityMatrixInputSchema,
    outputSchema: exportBaseCapabilityMatrixOutputSchema,
  }),
  selectMemberResponseWorkbookForImport: defineContract({
    channel: 'cmm:member-responses:select-import-workbook',
    inputSchema: opportunityIdInputSchema,
    outputSchema: selectMemberResponseWorkbookForImportOutputSchema,
  }),
  saveMemberResponseImport: defineContract({
    channel: 'cmm:member-responses:save-import',
    inputSchema: saveMemberResponseImportInputSchema,
    outputSchema: memberResponseSchema,
  }),
  archiveOpportunity: defineContract({
    channel: 'cmm:opportunities:archive',
    inputSchema: opportunityIdInputSchema,
    outputSchema: opportunitySchema,
  }),
  restoreArchivedOpportunity: defineContract({
    channel: 'cmm:opportunities:restore-archived',
    inputSchema: opportunityIdInputSchema,
    outputSchema: opportunitySchema,
  }),
  hardDeleteArchivedOpportunity: defineContract({
    channel: 'cmm:opportunities:hard-delete-archived',
    inputSchema: opportunityIdInputSchema,
    outputSchema: hardDeleteArchivedOpportunityOutputSchema,
  }),
};

export const cmmWindowLifecycleChannels = {
  requestClose: 'cmm:window:request-close',
  respondClose: 'cmm:window:respond-close',
} as const;

export const validateIpcInput = <Input, Output>(
  contract: IpcContract<Input, Output>,
  value: unknown,
): Input => contract.inputSchema.parse(value);

export const validateIpcOutput = <Input, Output>(
  contract: IpcContract<Input, Output>,
  value: unknown,
): Output => contract.outputSchema.parse(value);

export const validateWindowCloseRequest = (value: unknown): WindowCloseRequestDto =>
  windowCloseRequestSchema.parse(value);

export const validateWindowCloseResponse = (value: unknown): WindowCloseResponseDto =>
  windowCloseResponseSchema.parse(value);

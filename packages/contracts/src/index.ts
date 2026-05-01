import { z } from 'zod';

const isoDateTimeSchema = z.string().min(1);
const nullableTextSchema = z.string().nullable();

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

const openOpportunityOutputSchema = z.object({
  opportunity: opportunitySchema,
  baseCapabilityMatrix: baseCapabilityMatrixSchema,
});

const hardDeleteArchivedOpportunityOutputSchema = z.object({
  opportunityId: z.string().min(1),
});

export type OpportunityDto = z.infer<typeof opportunitySchema>;
export type RequirementDto = z.infer<typeof requirementSchema>;
export type BaseCapabilityMatrixDto = z.infer<typeof baseCapabilityMatrixSchema>;
export type CreateOpportunityIpcInput = z.infer<typeof createOpportunityInputSchema>;
export type OpenOpportunityIpcInput = z.infer<typeof opportunityIdInputSchema>;
export type OpenOpportunityIpcOutput = z.infer<typeof openOpportunityOutputSchema>;
export type OpportunityLifecycleIpcInput = z.infer<typeof opportunityIdInputSchema>;
export type SaveBaseCapabilityMatrixIpcInput = z.infer<typeof baseCapabilityMatrixSchema>;
export type HardDeleteArchivedOpportunityIpcOutput = z.infer<
  typeof hardDeleteArchivedOpportunityOutputSchema
>;

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

export const validateIpcInput = <Input, Output>(
  contract: IpcContract<Input, Output>,
  value: unknown,
): Input => contract.inputSchema.parse(value);

export const validateIpcOutput = <Input, Output>(
  contract: IpcContract<Input, Output>,
  value: unknown,
): Output => contract.outputSchema.parse(value);

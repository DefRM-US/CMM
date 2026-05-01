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

const openOpportunityInputSchema = z.object({
  opportunityId: z
    .string()
    .refine((value) => value.trim().length > 0, 'Opportunity ID is required.'),
});

const emptyBaseCapabilityMatrixSchema = z.object({
  opportunityId: z.string().min(1),
  requirements: z.array(z.never()),
});

const openOpportunityOutputSchema = z.object({
  opportunity: opportunitySchema,
  baseCapabilityMatrix: emptyBaseCapabilityMatrixSchema,
});

export type OpportunityDto = z.infer<typeof opportunitySchema>;
export type CreateOpportunityIpcInput = z.infer<typeof createOpportunityInputSchema>;
export type OpenOpportunityIpcInput = z.infer<typeof openOpportunityInputSchema>;
export type OpenOpportunityIpcOutput = z.infer<typeof openOpportunityOutputSchema>;

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
  openOpportunity: defineContract({
    channel: 'cmm:opportunities:open',
    inputSchema: openOpportunityInputSchema,
    outputSchema: openOpportunityOutputSchema,
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

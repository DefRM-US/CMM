export type IsoDateTime = string;
export type OpportunityId = string;

export type Opportunity = {
  id: OpportunityId;
  name: string;
  solicitationNumber: string | null;
  issuingAgency: string | null;
  description: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  lastOpenedAt: IsoDateTime | null;
  archivedAt: IsoDateTime | null;
};

export type CreateOpportunityInput = {
  name: string;
  solicitationNumber?: string | null | undefined;
  issuingAgency?: string | null | undefined;
  description?: string | null | undefined;
};

export type BaseCapabilityMatrix = {
  opportunityId: OpportunityId;
  requirements: never[];
};

export const normalizeRequiredText = (value: string): string => value.trim();

export const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

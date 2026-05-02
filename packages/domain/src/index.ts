export type IsoDateTime = string;
export type OpportunityId = string;
export type RequirementId = string;
export type CapabilityScore = 0 | 1 | 2 | 3;
export type MemberResponseId = string;

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
  revision: number;
  requirements: Requirement[];
};

export type Requirement = {
  id: RequirementId;
  text: string;
  level: number;
  position: number;
  retiredAt: IsoDateTime | null;
};

export type MemberResponseEvaluationState = 'candidate' | 'selected' | 'hidden';

export type MemberResponse = {
  id: MemberResponseId;
  opportunityId: OpportunityId;
  memberName: string;
  sourceFilename: string | null;
  workbookTitle: string | null;
  importedAt: IsoDateTime;
  archivedAt: IsoDateTime | null;
  evaluationState: MemberResponseEvaluationState | null;
};

export type MemberResponseRow = {
  id: string;
  memberResponseId: MemberResponseId;
  requirementId: RequirementId;
  requirementNumber: string;
  requirementText: string;
  capabilityScore: CapabilityScore | null;
  pastPerformanceReference: string;
  responseComment: string;
  position: number;
};

export type RequirementNumber = {
  requirement: Requirement;
  displayNumber: string;
};

export type RequirementNumberOptions = {
  includeRetired?: boolean;
};

const orderRequirements = (requirements: Requirement[]): Requirement[] =>
  [...requirements].sort((left, right) => left.position - right.position);

const findRequirementIndex = (requirements: Requirement[], requirementId: RequirementId): number =>
  requirements.findIndex((requirement) => requirement.id === requirementId);

const findSubtreeEndIndex = (requirements: Requirement[], startIndex: number): number => {
  const root = requirements[startIndex];
  if (!root) {
    return startIndex;
  }

  let endIndex = startIndex + 1;
  while (endIndex < requirements.length && (requirements[endIndex]?.level ?? 1) > root.level) {
    endIndex += 1;
  }
  return endIndex;
};

const assignRequirementPositions = (requirements: Requirement[]): Requirement[] =>
  requirements.map((requirement, position) => ({
    ...requirement,
    level: Math.max(1, requirement.level),
    position,
  }));

export const normalizeRequiredText = (value: string): string => value.trim();

export const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const computeRequirementNumbers = (
  requirements: Requirement[],
  options: RequirementNumberOptions = {},
): RequirementNumber[] => {
  const counters: number[] = [];
  return orderRequirements(requirements)
    .filter((requirement) => options.includeRetired || requirement.retiredAt === null)
    .map((requirement) => {
      const level = Math.max(1, requirement.level);
      counters.length = level;
      counters[level - 1] = (counters[level - 1] ?? 0) + 1;

      for (let index = 0; index < level - 1; index += 1) {
        counters[index] = counters[index] ?? 1;
      }

      return {
        requirement,
        displayNumber: counters.slice(0, level).join('.'),
      };
    });
};

export const normalizeRequirementPositions = (requirements: Requirement[]): Requirement[] =>
  assignRequirementPositions(orderRequirements(requirements));

export const editRequirementText = (
  requirements: Requirement[],
  requirementId: RequirementId,
  text: string,
): Requirement[] =>
  normalizeRequirementPositions(
    requirements.map((requirement) =>
      requirement.id === requirementId
        ? {
            ...requirement,
            text,
          }
        : requirement,
    ),
  );

export const moveRequirement = (
  requirements: Requirement[],
  requirementId: RequirementId,
  targetPosition: number,
): Requirement[] => {
  const ordered = normalizeRequirementPositions(requirements);
  const index = findRequirementIndex(ordered, requirementId);
  if (index === -1) {
    return ordered;
  }

  const [removed] = ordered.splice(index, 1);
  if (!removed) {
    return ordered;
  }

  const insertAt = Math.max(0, Math.min(targetPosition, ordered.length));
  ordered.splice(insertAt, 0, removed);
  return assignRequirementPositions(ordered);
};

export const indentRequirement = (
  requirements: Requirement[],
  requirementId: RequirementId,
): Requirement[] => {
  const ordered = normalizeRequirementPositions(requirements);
  const index = findRequirementIndex(ordered, requirementId);
  const target = ordered[index];
  const previous = ordered[index - 1];
  if (!target || !previous) {
    return ordered;
  }

  const nextLevel = Math.min(target.level + 1, previous.level + 1);
  const levelDelta = nextLevel - target.level;
  if (levelDelta === 0) {
    return ordered;
  }

  const subtreeEnd = findSubtreeEndIndex(ordered, index);
  return normalizeRequirementPositions(
    ordered.map((requirement, requirementIndex) =>
      requirementIndex >= index && requirementIndex < subtreeEnd
        ? {
            ...requirement,
            level: requirement.level + levelDelta,
          }
        : requirement,
    ),
  );
};

export const outdentRequirement = (
  requirements: Requirement[],
  requirementId: RequirementId,
): Requirement[] => {
  const ordered = normalizeRequirementPositions(requirements);
  const index = findRequirementIndex(ordered, requirementId);
  const target = ordered[index];
  if (!target || target.level === 1) {
    return ordered;
  }

  const subtreeEnd = findSubtreeEndIndex(ordered, index);
  return normalizeRequirementPositions(
    ordered.map((requirement, requirementIndex) =>
      requirementIndex >= index && requirementIndex < subtreeEnd
        ? {
            ...requirement,
            level: Math.max(1, requirement.level - 1),
          }
        : requirement,
    ),
  );
};

export const retireRequirement = (
  requirements: Requirement[],
  requirementId: RequirementId,
  retiredAt: IsoDateTime,
): Requirement[] => {
  const ordered = normalizeRequirementPositions(requirements);
  const index = findRequirementIndex(ordered, requirementId);
  if (index === -1) {
    return ordered;
  }

  const subtreeEnd = findSubtreeEndIndex(ordered, index);
  return normalizeRequirementPositions(
    ordered.map((requirement, requirementIndex) =>
      requirementIndex >= index && requirementIndex < subtreeEnd
        ? {
            ...requirement,
            retiredAt,
          }
        : requirement,
    ),
  );
};

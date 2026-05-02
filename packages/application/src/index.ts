import type {
  BaseCapabilityMatrix,
  CapabilityScore,
  CreateOpportunityInput,
  IsoDateTime,
  MemberResponse,
  MemberResponseRow,
  Opportunity,
  OpportunityId,
  Requirement,
  RequirementId,
} from '@cmm/domain';
import {
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeRequirementPositions,
} from '@cmm/domain';

export type Clock = {
  now(): IsoDateTime;
};

export type IdGenerator = {
  next(): string;
};

export type OpportunityRepository = {
  saveOpportunity(opportunity: Opportunity): Promise<void>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  listArchivedOpportunities(): Promise<Opportunity[]>;
  findActiveOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null>;
  findArchivedOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null>;
  markOpportunityOpened(
    opportunityId: OpportunityId,
    lastOpenedAt: IsoDateTime,
  ): Promise<Opportunity>;
  archiveOpportunity(opportunityId: OpportunityId, archivedAt: IsoDateTime): Promise<Opportunity>;
  restoreArchivedOpportunity(
    opportunityId: OpportunityId,
    restoredAt: IsoDateTime,
  ): Promise<Opportunity>;
  hardDeleteArchivedOpportunity(opportunityId: OpportunityId): Promise<void>;
  loadBaseCapabilityMatrix(opportunityId: OpportunityId): Promise<BaseCapabilityMatrix>;
  saveBaseCapabilityMatrix(matrix: BaseCapabilityMatrix): Promise<BaseCapabilityMatrix>;
  listActiveMemberResponses(opportunityId: OpportunityId): Promise<MemberResponse[]>;
  loadMemberResponseRows(memberResponseId: string): Promise<MemberResponseRow[]>;
  saveActiveMemberResponse(input: SaveActiveMemberResponseRepositoryInput): Promise<MemberResponse>;
};

export type OpenOpportunityInput = {
  opportunityId: OpportunityId;
};

export type ArchiveOpportunityInput = {
  opportunityId: OpportunityId;
};

export type RestoreArchivedOpportunityInput = {
  opportunityId: OpportunityId;
};

export type HardDeleteArchivedOpportunityInput = {
  opportunityId: OpportunityId;
};

export type SaveBaseCapabilityMatrixInput = {
  opportunityId: OpportunityId;
  revision: number;
  requirements: Requirement[];
};

export type BaseCapabilityMatrixExportChoices = {
  includeBlankRequirements: boolean;
  includeRetiredRequirements: boolean;
};

export type ExportBaseCapabilityMatrixInput = {
  opportunityId: OpportunityId;
} & BaseCapabilityMatrixExportChoices;

export type ParsedMemberResponseWorkbookRow = {
  requirementId: string;
  requirementNumber: string;
  requirementText: string;
  capabilityScore: CapabilityScore | null;
  pastPerformanceReference: string;
  responseComment: string;
};

export type ParsedMemberResponseWorkbook = {
  metadata: {
    workbookFormatVersion: string;
    opportunityId: string;
    exportTimestamp: IsoDateTime;
  };
  workbookTitle: string;
  memberName: string;
  rows: ParsedMemberResponseWorkbookRow[];
};

export type PreviewMemberResponseImportInput = {
  opportunityId: OpportunityId;
  sourceFilename: string | null;
  parsedWorkbook: ParsedMemberResponseWorkbook;
};

export type MemberResponseImportPreviewRow = {
  requirementId: RequirementId;
  requirementNumber: string;
  requirementText: string;
  requirementRetiredAt: IsoDateTime | null;
  capabilityScore: CapabilityScore | null;
  pastPerformanceReference: string;
  responseComment: string;
};

export type MemberResponseImportPreview = {
  opportunityId: OpportunityId;
  sourceFilename: string | null;
  workbookTitle: string | null;
  suggestedMemberName: string;
  rows: MemberResponseImportPreviewRow[];
};

export type SaveMemberResponseImportInput = MemberResponseImportPreview & {
  memberName: string;
};

export type SaveActiveMemberResponseRepositoryInput = {
  memberResponse: MemberResponse;
  rows: MemberResponseRow[];
  normalizedMemberName: string;
  archivedAt: IsoDateTime;
};

export type OpenOpportunityResult = {
  opportunity: Opportunity;
  baseCapabilityMatrix: BaseCapabilityMatrix;
};

export type BuildBaseCapabilityMatrixWorkbookInput = {
  opportunity: Opportunity;
  exportTimestamp: IsoDateTime;
  requirements: Requirement[];
  exportChoices: BaseCapabilityMatrixExportChoices;
};

export type BaseCapabilityMatrixWorkbookBuilder = {
  buildBaseCapabilityMatrixWorkbook(
    input: BuildBaseCapabilityMatrixWorkbookInput,
  ): Promise<Uint8Array>;
};

export type ExportBaseCapabilityMatrixResult = {
  workbook: Uint8Array;
  suggestedFilename: string;
  exportTimestamp: IsoDateTime;
};

export type OpportunityService = {
  createOpportunity(input: CreateOpportunityInput): Promise<Opportunity>;
  listActiveOpportunities(): Promise<Opportunity[]>;
  listArchivedOpportunities(): Promise<Opportunity[]>;
  openOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  openArchivedOpportunity(input: OpenOpportunityInput): Promise<OpenOpportunityResult>;
  saveBaseCapabilityMatrix(input: SaveBaseCapabilityMatrixInput): Promise<BaseCapabilityMatrix>;
  exportBaseCapabilityMatrix(
    input: ExportBaseCapabilityMatrixInput,
  ): Promise<ExportBaseCapabilityMatrixResult>;
  previewMemberResponseImport(
    input: PreviewMemberResponseImportInput,
  ): Promise<MemberResponseImportPreview>;
  saveMemberResponseImport(input: SaveMemberResponseImportInput): Promise<MemberResponse>;
  archiveOpportunity(input: ArchiveOpportunityInput): Promise<Opportunity>;
  restoreArchivedOpportunity(input: RestoreArchivedOpportunityInput): Promise<Opportunity>;
  hardDeleteArchivedOpportunity(input: HardDeleteArchivedOpportunityInput): Promise<void>;
};

export type CreateOpportunityServiceOptions = {
  repository: OpportunityRepository;
  clock: Clock;
  ids: IdGenerator;
  workbookBuilder?: BaseCapabilityMatrixWorkbookBuilder;
};

export class ApplicationError extends Error {
  constructor(
    readonly code:
      | 'opportunity.nameRequired'
      | 'opportunity.notFound'
      | 'baseMatrix.revisionConflict'
      | 'memberResponse.noUsableRows'
      | 'memberResponse.memberNameRequired',
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
  workbookBuilder,
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

  listArchivedOpportunities() {
    return repository.listArchivedOpportunities();
  },

  async openOpportunity(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const opportunity = await repository.markOpportunityOpened(input.opportunityId, clock.now());
    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(opportunity.id);
    return { opportunity, baseCapabilityMatrix };
  },

  async openArchivedOpportunity(input) {
    const opportunity = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(opportunity.id);
    return { opportunity, baseCapabilityMatrix };
  },

  async saveBaseCapabilityMatrix(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const currentMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    if (currentMatrix.revision !== input.revision) {
      throw new ApplicationError(
        'baseMatrix.revisionConflict',
        'Base Capability Matrix has changed since it was opened.',
      );
    }

    return repository.saveBaseCapabilityMatrix({
      opportunityId: input.opportunityId,
      revision: input.revision,
      requirements: normalizeRequirementPositions(input.requirements),
    });
  },

  async exportBaseCapabilityMatrix(input) {
    const opportunity = await repository.findActiveOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }
    if (!workbookBuilder) {
      throw new Error('Base Capability Matrix workbook builder is not configured.');
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    const exportTimestamp = clock.now();
    const workbook = await workbookBuilder.buildBaseCapabilityMatrixWorkbook({
      opportunity,
      exportTimestamp,
      requirements: baseCapabilityMatrix.requirements,
      exportChoices: {
        includeBlankRequirements: input.includeBlankRequirements,
        includeRetiredRequirements: input.includeRetiredRequirements,
      },
    });

    return {
      workbook,
      suggestedFilename: `${toWorkbookFilenameStem(opportunity.name)} - Base Capability Matrix.xlsx`,
      exportTimestamp,
    };
  },

  async previewMemberResponseImport(input) {
    const opportunity = await repository.findActiveOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    const requirementsById = new Map(
      baseCapabilityMatrix.requirements.map((requirement) => [requirement.id, requirement]),
    );
    const rows = input.parsedWorkbook.rows.flatMap((parsedRow) => {
      const requirementId = normalizeRequiredText(parsedRow.requirementId);
      const requirement = requirementsById.get(requirementId);
      if (!requirement || !isUsableParsedMemberResponseRow(parsedRow)) {
        return [];
      }

      return [
        {
          requirementId: requirement.id,
          requirementNumber: normalizeRequiredText(parsedRow.requirementNumber),
          requirementText: normalizeRequiredText(parsedRow.requirementText) || requirement.text,
          requirementRetiredAt: requirement.retiredAt,
          capabilityScore: parsedRow.capabilityScore,
          pastPerformanceReference: normalizeResponseText(parsedRow.pastPerformanceReference),
          responseComment: normalizeResponseText(parsedRow.responseComment),
        },
      ];
    });

    if (rows.length === 0) {
      throw new ApplicationError(
        'memberResponse.noUsableRows',
        'Member Response workbook has no usable response rows.',
      );
    }

    return {
      opportunityId: input.opportunityId,
      sourceFilename: normalizeOptionalText(input.sourceFilename),
      workbookTitle: normalizeOptionalText(input.parsedWorkbook.workbookTitle),
      suggestedMemberName: getSuggestedMemberName(
        input.parsedWorkbook.memberName,
        input.sourceFilename,
      ),
      rows,
    };
  },

  async saveMemberResponseImport(input) {
    const opportunity = await repository.findActiveOpportunityById(input.opportunityId);
    if (!opportunity) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    const memberName = normalizeMemberName(input.memberName);
    if (!memberName) {
      throw new ApplicationError(
        'memberResponse.memberNameRequired',
        'Potential Consortium Member name is required.',
      );
    }

    const baseCapabilityMatrix = await repository.loadBaseCapabilityMatrix(input.opportunityId);
    const requirementsById = new Map(
      baseCapabilityMatrix.requirements.map((requirement) => [requirement.id, requirement]),
    );
    const usableRows = input.rows.flatMap((row) => {
      const requirement = requirementsById.get(row.requirementId);
      if (!requirement || !isUsableMemberResponseImportRow(row)) {
        return [];
      }

      return [
        {
          requirementId: requirement.id,
          requirementNumber: normalizeRequiredText(row.requirementNumber),
          requirementText: normalizeRequiredText(row.requirementText) || requirement.text,
          capabilityScore: row.capabilityScore,
          pastPerformanceReference: normalizeResponseText(row.pastPerformanceReference),
          responseComment: normalizeResponseText(row.responseComment),
        },
      ];
    });

    if (usableRows.length === 0) {
      throw new ApplicationError(
        'memberResponse.noUsableRows',
        'Member Response workbook has no usable response rows.',
      );
    }

    const importedAt = clock.now();
    const memberResponseId = ids.next();
    const memberResponse: MemberResponse = {
      id: memberResponseId,
      opportunityId: input.opportunityId,
      memberName,
      sourceFilename: normalizeOptionalText(input.sourceFilename),
      workbookTitle: normalizeOptionalText(input.workbookTitle),
      importedAt,
      archivedAt: null,
      evaluationState: 'candidate',
    };
    const rows: MemberResponseRow[] = usableRows.map((row, position) => ({
      id: ids.next(),
      memberResponseId,
      ...row,
      position,
    }));

    return repository.saveActiveMemberResponse({
      memberResponse,
      rows,
      normalizedMemberName: normalizeMemberIdentity(memberName),
      archivedAt: importedAt,
    });
  },

  async archiveOpportunity(input) {
    const existing = await repository.findActiveOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    return repository.archiveOpportunity(input.opportunityId, clock.now());
  },

  async restoreArchivedOpportunity(input) {
    const existing = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    return repository.restoreArchivedOpportunity(input.opportunityId, clock.now());
  },

  async hardDeleteArchivedOpportunity(input) {
    const existing = await repository.findArchivedOpportunityById(input.opportunityId);
    if (!existing) {
      throw new ApplicationError('opportunity.notFound', 'Opportunity not found.');
    }

    await repository.hardDeleteArchivedOpportunity(input.opportunityId);
  },
});

const invalidFilenameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

const sanitizeFilenameCharacter = (character: string): string =>
  invalidFilenameCharacters.has(character) || character.charCodeAt(0) < 32 ? ' ' : character;

const toWorkbookFilenameStem = (name: string): string => {
  const stem = name.split('').map(sanitizeFilenameCharacter).join('').replace(/\s+/g, ' ').trim();
  return stem.length > 0 ? stem : 'Opportunity';
};

const normalizeResponseText = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

const isUsableParsedMemberResponseRow = (row: ParsedMemberResponseWorkbookRow): boolean =>
  row.capabilityScore !== null ||
  normalizeResponseText(row.pastPerformanceReference).length > 0 ||
  normalizeResponseText(row.responseComment).length > 0;

const isUsableMemberResponseImportRow = (row: MemberResponseImportPreviewRow): boolean =>
  row.capabilityScore !== null ||
  normalizeResponseText(row.pastPerformanceReference).length > 0 ||
  normalizeResponseText(row.responseComment).length > 0;

const normalizeMemberName = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeMemberIdentity = (value: string): string => normalizeMemberName(value).toLowerCase();

const getSuggestedMemberName = (
  workbookMemberName: string,
  sourceFilename: string | null,
): string => {
  const normalizedMemberName = normalizeRequiredText(workbookMemberName);
  if (normalizedMemberName) {
    return normalizedMemberName;
  }

  const filename = normalizeOptionalText(sourceFilename);
  if (!filename) {
    return '';
  }

  const extensionStart = filename.lastIndexOf('.');
  const stem = extensionStart > 0 ? filename.slice(0, extensionStart) : filename;
  return normalizeRequiredText(stem);
};

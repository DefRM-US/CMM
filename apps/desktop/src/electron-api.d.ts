export interface DesktopProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface DesktopRequirementRowRecord {
  id: string;
  text: string;
  level: number;
  position: number;
}

export interface DesktopCapabilityImportRecord {
  id: string;
  projectId: string;
  companyName: string;
  sourceFilename: string | null;
  importedAt: string;
  archivedAt: string | null;
}

export interface DesktopCapabilityImportRowRecord {
  id: string;
  importId: string;
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance: string | null;
  comments: string | null;
}

export interface DesktopParsedCapabilityMatrixRow {
  number: string;
  text: string;
  score: number | null;
  pastPerformance: string;
  comments: string;
}

export interface DesktopParsedCapabilityMatrixSheet {
  title: string;
  rows: DesktopParsedCapabilityMatrixRow[];
}

export interface DesktopCapabilityImportRowInput {
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance?: string | null;
  comments?: string | null;
}

export interface DesktopApi {
  initDatabase(): Promise<void>;
  listProjects(): Promise<DesktopProjectRecord[]>;
  createProject(name: string): Promise<DesktopProjectRecord>;
  deleteProjects(projectIds: string[]): Promise<void>;
  seedSampleProjects(size?: 'compact' | 'medium' | 'large'): Promise<number>;
  touchProject(projectId: string): Promise<void>;
  loadProjectRequirements(projectId: string): Promise<DesktopRequirementRowRecord[]>;
  saveProjectRequirements(projectId: string, rows: DesktopRequirementRowRecord[]): Promise<void>;
  listCapabilityImports(
    projectId: string,
    includeArchived?: boolean,
  ): Promise<DesktopCapabilityImportRecord[]>;
  listCapabilityImportRows(importId: string): Promise<DesktopCapabilityImportRowRecord[]>;
  saveCapabilityImportWithRows(input: {
    projectId: string;
    companyName: string;
    sourceFilename?: string | null;
    rows: DesktopCapabilityImportRowInput[];
  }): Promise<DesktopCapabilityImportRecord>;
  showSaveDialog(defaultFileName: string): Promise<string | null>;
  showOpenDialog(): Promise<string[] | null>;
  generateCapabilityMatrixSpreadsheet(options: {
    title: string;
    legend: {
      3: string;
      2: string;
      1: string;
      0: string;
    };
    rows: Array<{
      number: string;
      text: string;
      score: 0 | 1 | 2 | 3;
      pastPerformance?: string;
      comments?: string;
    }>;
    filePath: string;
  }): Promise<string>;
  parseCapabilityMatrixSpreadsheet(filePath: string): Promise<DesktopParsedCapabilityMatrixSheet>;
}

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}

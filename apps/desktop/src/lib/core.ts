import type {
  DesktopCapabilityImportRecord,
  DesktopCapabilityImportRowRecord,
  DesktopParsedCapabilityMatrixSheet,
  DesktopProjectRecord,
  DesktopRequirementRowRecord,
} from '../electron-api';

export type ProjectRecord = DesktopProjectRecord;
export type StoredRequirementRow = DesktopRequirementRowRecord;
export type CapabilityImportRecord = DesktopCapabilityImportRecord;
export type CapabilityImportRowRecord = DesktopCapabilityImportRowRecord;
export type ParsedCapabilityMatrixRow = DesktopParsedCapabilityMatrixSheet['rows'][number];

export const initDatabase = () => window.desktopApi.initDatabase();
export const listProjects = () => window.desktopApi.listProjects();
export const createProject = (name: string) => window.desktopApi.createProject(name);
export const deleteProjects = (projectIds: string[]) =>
  window.desktopApi.deleteProjects(projectIds);
export const seedSampleProjects = (size: 'compact' | 'medium' | 'large' = 'compact') =>
  window.desktopApi.seedSampleProjects(size);
export const touchProject = (projectId: string) => window.desktopApi.touchProject(projectId);
export const loadProjectRequirements = (projectId: string) =>
  window.desktopApi.loadProjectRequirements(projectId);
export const saveProjectRequirements = (projectId: string, rows: DesktopRequirementRowRecord[]) =>
  window.desktopApi.saveProjectRequirements(projectId, rows);
export const listCapabilityImports = (projectId: string, includeArchived = false) =>
  window.desktopApi.listCapabilityImports(projectId, includeArchived);
export const listCapabilityImportRows = (importId: string) =>
  window.desktopApi.listCapabilityImportRows(importId);
export const saveCapabilityImportWithRows = (input: {
  projectId: string;
  companyName: string;
  sourceFilename?: string | null;
  rows: Array<{
    requirementId: string | null;
    requirementNumber: string;
    requirementText: string;
    score: number | null;
    pastPerformance?: string | null;
    comments?: string | null;
  }>;
}) => window.desktopApi.saveCapabilityImportWithRows(input);
export const generateCapabilityMatrixSpreadsheet = (options: {
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
}) => window.desktopApi.generateCapabilityMatrixSpreadsheet(options);
export const parseCapabilityMatrixSpreadsheet = (filePath: string) =>
  window.desktopApi.parseCapabilityMatrixSpreadsheet(filePath);
export const showSaveDialog = (defaultFileName: string) =>
  window.desktopApi.showSaveDialog(defaultFileName);
export const showOpenDialog = () => window.desktopApi.showOpenDialog();

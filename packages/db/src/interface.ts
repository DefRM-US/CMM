import type {
  CapabilityMatrix,
  CapabilityMatrixRow,
  CapabilityMatrixWithRows,
  CreateMatrixInput,
  CreateMatrixRowInput,
  UpdateMatrixRowInput,
} from "@cmm/core";

/**
 * Database interface for CMM operations
 * Implementations can use different SQLite libraries based on platform
 */
export interface DatabaseInterface {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Matrix CRUD
  getAllMatrices(): Promise<CapabilityMatrix[]>;
  getUserMatrices(): Promise<CapabilityMatrix[]>;
  getImportedMatrices(): Promise<CapabilityMatrix[]>;
  getTemplateMatrices(): Promise<CapabilityMatrix[]>;
  getChildMatrices(parentId: string): Promise<CapabilityMatrix[]>;
  getMatrixById(id: string): Promise<CapabilityMatrix | null>;
  getMatrixWithRows(id: string): Promise<CapabilityMatrixWithRows | null>;
  createMatrix(input: CreateMatrixInput): Promise<CapabilityMatrix>;
  updateMatrixName(id: string, name: string): Promise<void>;
  deleteMatrix(id: string): Promise<void>;

  // Row CRUD
  getMatrixRows(matrixId: string): Promise<CapabilityMatrixRow[]>;
  createMatrixRow(input: CreateMatrixRowInput): Promise<CapabilityMatrixRow>;
  updateMatrixRow(id: string, input: UpdateMatrixRowInput): Promise<void>;
  deleteMatrixRow(id: string): Promise<void>;
  updateRowOrders(updates: Array<{ id: string; rowOrder: number }>): Promise<void>;

  // Bulk operations
  createEmptyRows(matrixId: string, count: number): Promise<CapabilityMatrixRow[]>;
  createMatrixWithRows(
    input: CreateMatrixInput,
    rowCount: number
  ): Promise<CapabilityMatrixWithRows>;
  deleteRowsByRequirement(requirement: string): Promise<{
    deletedCount: number;
    affectedMatrixIds: string[];
    deletedRows: CapabilityMatrixRow[];
  }>;
  restoreRows(rows: CapabilityMatrixRow[]): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string | null): Promise<void>;
  getActiveMatrixId(): Promise<string | null>;
  setActiveMatrixId(id: string | null): Promise<void>;
  getTheme(): Promise<"light" | "dark" | null>;
  setTheme(theme: "light" | "dark" | null): Promise<void>;

  // Stats
  countMatrices(): Promise<{ total: number; user: number; imported: number }>;
}

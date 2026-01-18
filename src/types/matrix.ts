/**
 * Score type for capability ratings
 * 0 = No capability
 * 1 = Some capability
 * 2 = Good capability
 * 3 = Excellent capability
 * null = Not yet rated
 */
export type Score = 0 | 1 | 2 | 3 | null;

/**
 * Represents a single row in a capability matrix
 */
export interface CapabilityMatrixRow {
  /** Unique identifier for the row */
  id: string;
  /** Foreign key reference to parent matrix */
  matrixId: string;
  /** The requirement text from the RFP/PWS */
  requirements: string;
  /** Capability score (0-3) or null if unset */
  experienceAndCapability: Score;
  /** Past performance reference text */
  pastPerformance: string;
  /** Additional notes/comments */
  comments: string;
  /** Order index for sorting/reordering */
  rowOrder: number;
}

/**
 * Represents a capability matrix (collection of rows)
 */
export interface CapabilityMatrix {
  /** Unique identifier for the matrix */
  id: string;
  /** Display name (e.g., company name or "Our Response") */
  name: string;
  /** Whether this matrix was imported from Excel */
  isImported: boolean;
  /** Original filename if imported */
  sourceFile: string | null;
  /** Parent matrix ID - links imported matrices to their template */
  parentMatrixId: string | null;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

/**
 * Matrix with its rows included (for convenience)
 */
export interface CapabilityMatrixWithRows extends CapabilityMatrix {
  rows: CapabilityMatrixRow[];
}

/**
 * Input type for creating a new matrix
 */
export interface CreateMatrixInput {
  name: string;
  isImported?: boolean;
  sourceFile?: string | null;
  parentMatrixId?: string | null;
}

/**
 * Input type for creating a new matrix row
 */
export interface CreateMatrixRowInput {
  matrixId: string;
  requirements?: string;
  experienceAndCapability?: Score;
  pastPerformance?: string;
  comments?: string;
  rowOrder?: number;
}

/**
 * Input type for updating a matrix row
 */
export interface UpdateMatrixRowInput {
  requirements?: string;
  experienceAndCapability?: Score;
  pastPerformance?: string;
  comments?: string;
  rowOrder?: number;
}

/**
 * App settings that can be persisted
 */
export interface AppSettings {
  /** Currently active matrix ID for editing */
  activeMatrixId: string | null;
  /** Theme preference */
  theme: "light" | "dark" | null;
}

/**
 * Score metadata for display and export
 */
export interface ScoreInfo {
  value: Score;
  color: string;
  bgClass: string;
  textClass: string;
  label: string;
  description: string;
}

/**
 * Score configuration map
 */
export const SCORE_CONFIG: Record<Exclude<Score, null>, ScoreInfo> = {
  3: {
    value: 3,
    color: "#4472C4",
    bgClass: "score-badge-3",
    textClass: "text-white",
    label: "Excellent",
    description:
      "Excellent capability - significant experience and past performance inputs; applicable to NITE SOW",
  },
  2: {
    value: 2,
    color: "#70AD47",
    bgClass: "score-badge-2",
    textClass: "text-white",
    label: "Good",
    description:
      "Good capability - significant experience and past performance inputs; applicable to NITE SOW and executed on other than Training programs but on related platforms",
  },
  1: {
    value: 1,
    color: "#FFC000",
    bgClass: "score-badge-1",
    textClass: "text-black",
    label: "Some",
    description: "Some capability - minor or scattered experience",
  },
  0: {
    value: 0,
    color: "#E5E5E5",
    bgClass: "score-badge-0",
    textClass: "text-black",
    label: "None",
    description: "No capability",
  },
};

/**
 * Helper to get score info, returns undefined for null scores
 */
export function getScoreInfo(score: Score): ScoreInfo | undefined {
  if (score === null) return undefined;
  return SCORE_CONFIG[score];
}

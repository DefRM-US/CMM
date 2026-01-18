import { createContext, useReducer, type ReactNode } from "react";
import type {
  CapabilityMatrix,
  CapabilityMatrixWithRows,
  CapabilityMatrixRow,
  UpdateMatrixRowInput,
} from "../types/matrix";

// State shape
export interface MatrixState {
  matrices: CapabilityMatrix[];
  activeMatrix: CapabilityMatrixWithRows | null;
  isLoading: boolean;
  error: string | null;
}

// Action types
export type MatrixAction =
  | { type: "SET_MATRICES"; payload: CapabilityMatrix[] }
  | { type: "SET_ACTIVE_MATRIX"; payload: CapabilityMatrixWithRows | null }
  | { type: "ADD_MATRIX"; payload: CapabilityMatrix }
  | { type: "REMOVE_MATRIX"; payload: string }
  | { type: "UPDATE_MATRIX_NAME"; payload: { id: string; name: string } }
  | { type: "SET_ROWS"; payload: CapabilityMatrixRow[] }
  | { type: "ADD_ROW"; payload: CapabilityMatrixRow }
  | { type: "UPDATE_ROW"; payload: { id: string; updates: UpdateMatrixRowInput } }
  | { type: "REMOVE_ROW"; payload: string }
  | { type: "REORDER_ROWS"; payload: CapabilityMatrixRow[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// Context value type
export interface MatrixContextValue {
  state: MatrixState;
  dispatch: React.Dispatch<MatrixAction>;
}

// Initial state
const initialState: MatrixState = {
  matrices: [],
  activeMatrix: null,
  isLoading: false,
  error: null,
};

// Reducer
function matrixReducer(state: MatrixState, action: MatrixAction): MatrixState {
  switch (action.type) {
    case "SET_MATRICES":
      return { ...state, matrices: action.payload };

    case "SET_ACTIVE_MATRIX":
      return { ...state, activeMatrix: action.payload };

    case "ADD_MATRIX":
      return { ...state, matrices: [action.payload, ...state.matrices] };

    case "REMOVE_MATRIX":
      return {
        ...state,
        matrices: state.matrices.filter((m) => m.id !== action.payload),
        activeMatrix:
          state.activeMatrix?.id === action.payload ? null : state.activeMatrix,
      };

    case "UPDATE_MATRIX_NAME":
      return {
        ...state,
        matrices: state.matrices.map((m) =>
          m.id === action.payload.id
            ? { ...m, name: action.payload.name }
            : m
        ),
        activeMatrix:
          state.activeMatrix?.id === action.payload.id
            ? { ...state.activeMatrix, name: action.payload.name }
            : state.activeMatrix,
      };

    case "SET_ROWS":
      if (!state.activeMatrix) return state;
      return {
        ...state,
        activeMatrix: { ...state.activeMatrix, rows: action.payload },
      };

    case "ADD_ROW":
      if (!state.activeMatrix) return state;
      return {
        ...state,
        activeMatrix: {
          ...state.activeMatrix,
          rows: [...state.activeMatrix.rows, action.payload],
        },
      };

    case "UPDATE_ROW":
      if (!state.activeMatrix) return state;
      return {
        ...state,
        activeMatrix: {
          ...state.activeMatrix,
          rows: state.activeMatrix.rows.map((row) =>
            row.id === action.payload.id
              ? { ...row, ...action.payload.updates }
              : row
          ),
        },
      };

    case "REMOVE_ROW":
      if (!state.activeMatrix) return state;
      return {
        ...state,
        activeMatrix: {
          ...state.activeMatrix,
          rows: state.activeMatrix.rows.filter(
            (row) => row.id !== action.payload
          ),
        },
      };

    case "REORDER_ROWS":
      if (!state.activeMatrix) return state;
      return {
        ...state,
        activeMatrix: { ...state.activeMatrix, rows: action.payload },
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// Create context
export const MatrixContext = createContext<MatrixContextValue | null>(null);

// Provider component
interface MatrixProviderProps {
  children: ReactNode;
}

export function MatrixProvider({ children }: MatrixProviderProps) {
  const [state, dispatch] = useReducer(matrixReducer, initialState);

  return (
    <MatrixContext.Provider value={{ state, dispatch }}>
      {children}
    </MatrixContext.Provider>
  );
}

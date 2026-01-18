import { useRef, useCallback, useEffect } from "react";
import { updateMatrixRow } from "../lib/database";
import type { UpdateMatrixRowInput } from "../types/matrix";

// Track pending saves per row
const pendingSaves = new Map<string, UpdateMatrixRowInput>();

export function useDebouncedSave(delay: number = 500) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Perform the actual save
  const performSave = useCallback(async () => {
    const saves = Array.from(pendingSaves.entries());
    pendingSaves.clear();

    for (const [rowId, updates] of saves) {
      try {
        await updateMatrixRow(rowId, updates);
      } catch (error) {
        console.error(`Failed to save row ${rowId}:`, error);
      }
    }
  }, []);

  // Queue a save for a specific row
  const queueSave = useCallback(
    (rowId: string, updates: UpdateMatrixRowInput) => {
      // Merge with any pending updates for this row
      const existing = pendingSaves.get(rowId) || {};
      pendingSaves.set(rowId, { ...existing, ...updates });

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          performSave();
        }
      }, delay);
    },
    [delay, performSave]
  );

  // Flush any pending saves on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Flush remaining saves
      if (pendingSaves.size > 0) {
        performSave();
      }
    };
  }, [performSave]);

  return queueSave;
}

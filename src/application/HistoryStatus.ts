/** Counts and barrier only; snapshots and command objects stay private. */
export interface HistoryStatus {
  readonly undoCount: number;
  readonly redoCount: number;
  readonly blocked: boolean;
}

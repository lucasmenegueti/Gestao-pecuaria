import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  lastSyncDate: string | null;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setLastSync: (date: string) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  lastSyncDate: null,
  isSyncing: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSync: (date) => set({ lastSyncDate: date }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
}));

import { create } from 'zustand';
import type { ConnectivityReport } from '../api/connectivity';

interface ConnectivityState {
  lastResult: ConnectivityReport | null;
  setLastResult: (result: ConnectivityReport) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  lastResult: null,
  setLastResult: (result) => set({ lastResult: result }),
}));

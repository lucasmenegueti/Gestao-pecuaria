import { create } from 'zustand';

interface RondaState {
  currentRondaId: number | null;
  currentPaddockId: number | null;
  currentPaddockName: string | null;
  currentPaddockHeads: number;
  currentPaddockArea: number;
  currentGrassTypeName: string | null;

  // Supplement wizard state
  supplement: {
    troughScore: string | null;
    restocked: boolean | null;
    formulaId: number | null;
    formulaName: string | null;
    kgPerSack: number;
    consumptionGPerDay: number;
    sacksInTrough: number;
    troughAccess: string | null;
    photoUri: string | null;
  };

  // Bombona wizard state
  bombona: {
    hasStock: boolean | null;
    formulaId: number | null;
    formulaName: string | null;
    kgPerSack: number;
    sacks: number;
    photoUri: string | null;
  };

  // Forage wizard state
  forage: {
    measurementType: string | null;
    measure1: number;
    measure2: number;
    measure3: number;
    quality: string | null;
    photoUri: string | null;
  };

  // Water wizard state
  water: {
    available: boolean | null;
    quality: string | null;
    photoUri: string | null;
  };

  // Health wizard state
  health: {
    parasiteFree: boolean | null;
    affectedPct: number;
    observations: string;
    photoUri: string | null;
  };

  // Fence wizard state
  fence: {
    voltage: number;
    isElectric: boolean;
    preventsMixing: boolean | null;
    photoUri: string | null;
  };

  // Visual weight wizard state
  visualWeight: {
    category: string | null;
    estimatedWeight: number;
    previousWeight: number | null;
    previousDate: string | null;
    photoUri: string | null;
  };

  // Washing wizard state
  washing: {
    wasWashed: boolean | null;
    photoUri: string | null;
  };

  // Biological in water wizard state
  biologicalWater: {
    applied: boolean | null;
    quantityG: number;
    photoUri: string | null;
  };

  setCurrentPaddock: (id: number, name: string, heads: number, area: number, grassType: string) => void;
  setRondaId: (id: number) => void;
  updateSupplement: (data: Partial<RondaState['supplement']>) => void;
  updateBombona: (data: Partial<RondaState['bombona']>) => void;
  updateForage: (data: Partial<RondaState['forage']>) => void;
  updateWater: (data: Partial<RondaState['water']>) => void;
  updateHealth: (data: Partial<RondaState['health']>) => void;
  updateFence: (data: Partial<RondaState['fence']>) => void;
  updateVisualWeight: (data: Partial<RondaState['visualWeight']>) => void;
  updateWashing: (data: Partial<RondaState['washing']>) => void;
  updateBiologicalWater: (data: Partial<RondaState['biologicalWater']>) => void;
  resetSupplement: () => void;
  resetBombona: () => void;
  resetForage: () => void;
  resetWater: () => void;
  resetHealth: () => void;
  resetFence: () => void;
  resetVisualWeight: () => void;
  resetWashing: () => void;
  resetBiologicalWater: () => void;
  resetAll: () => void;
}

const initialSupplement: RondaState['supplement'] = {
  troughScore: null,
  restocked: null,
  formulaId: null,
  formulaName: null,
  kgPerSack: 25,
  consumptionGPerDay: 100,
  sacksInTrough: 0,
  troughAccess: null,
  photoUri: null,
};

const initialBombona: RondaState['bombona'] = {
  hasStock: null,
  formulaId: null,
  formulaName: null,
  kgPerSack: 25,
  sacks: 0,
  photoUri: null,
};

const initialForage: RondaState['forage'] = {
  measurementType: null,
  measure1: 0,
  measure2: 0,
  measure3: 0,
  quality: null,
  photoUri: null,
};

const initialWater: RondaState['water'] = {
  available: null,
  quality: null,
  photoUri: null,
};

const initialHealth: RondaState['health'] = {
  parasiteFree: null,
  affectedPct: 0,
  observations: '',
  photoUri: null,
};

const initialFence: RondaState['fence'] = {
  voltage: 4500,
  isElectric: true,
  preventsMixing: null,
  photoUri: null,
};

const initialVisualWeight: RondaState['visualWeight'] = {
  category: null,
  estimatedWeight: 300,
  previousWeight: null,
  previousDate: null,
  photoUri: null,
};

const initialWashing: RondaState['washing'] = {
  wasWashed: null,
  photoUri: null,
};

const initialBiologicalWater: RondaState['biologicalWater'] = {
  applied: null,
  quantityG: 100,
  photoUri: null,
};

export const useRondaStore = create<RondaState>((set) => ({
  currentRondaId: null,
  currentPaddockId: null,
  currentPaddockName: null,
  currentPaddockHeads: 0,
  currentPaddockArea: 0,
  currentGrassTypeName: null,
  supplement: { ...initialSupplement },
  bombona: { ...initialBombona },
  forage: { ...initialForage },
  water: { ...initialWater },
  health: { ...initialHealth },
  fence: { ...initialFence },
  visualWeight: { ...initialVisualWeight },
  washing: { ...initialWashing },
  biologicalWater: { ...initialBiologicalWater },

  setCurrentPaddock: (id, name, heads, area, grassType) =>
    set({ currentPaddockId: id, currentPaddockName: name, currentPaddockHeads: heads, currentPaddockArea: area, currentGrassTypeName: grassType }),
  setRondaId: (id) => set({ currentRondaId: id }),
  updateSupplement: (data) => set((s) => ({ supplement: { ...s.supplement, ...data } })),
  updateBombona: (data) => set((s) => ({ bombona: { ...s.bombona, ...data } })),
  updateForage: (data) => set((s) => ({ forage: { ...s.forage, ...data } })),
  updateWater: (data) => set((s) => ({ water: { ...s.water, ...data } })),
  updateHealth: (data) => set((s) => ({ health: { ...s.health, ...data } })),
  updateFence: (data) => set((s) => ({ fence: { ...s.fence, ...data } })),
  updateVisualWeight: (data) => set((s) => ({ visualWeight: { ...s.visualWeight, ...data } })),
  updateWashing: (data) => set((s) => ({ washing: { ...s.washing, ...data } })),
  updateBiologicalWater: (data) => set((s) => ({ biologicalWater: { ...s.biologicalWater, ...data } })),
  resetSupplement: () => set({ supplement: { ...initialSupplement } }),
  resetBombona: () => set({ bombona: { ...initialBombona } }),
  resetForage: () => set({ forage: { ...initialForage } }),
  resetWater: () => set({ water: { ...initialWater } }),
  resetHealth: () => set({ health: { ...initialHealth } }),
  resetFence: () => set({ fence: { ...initialFence } }),
  resetVisualWeight: () => set({ visualWeight: { ...initialVisualWeight } }),
  resetWashing: () => set({ washing: { ...initialWashing } }),
  resetBiologicalWater: () => set({ biologicalWater: { ...initialBiologicalWater } }),
  resetAll: () => set({
    currentRondaId: null,
    currentPaddockId: null,
    currentPaddockName: null,
    currentPaddockHeads: 0,
    currentPaddockArea: 0,
    currentGrassTypeName: null,
    supplement: { ...initialSupplement },
    bombona: { ...initialBombona },
    forage: { ...initialForage },
    water: { ...initialWater },
    health: { ...initialHealth },
    fence: { ...initialFence },
    visualWeight: { ...initialVisualWeight },
    washing: { ...initialWashing },
    biologicalWater: { ...initialBiologicalWater },
  }),
}));

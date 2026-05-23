import { create } from "zustand";
import type { EquipmentSlotId, ItemGrade, PrimaryModule } from "../types";

export type AppScreen = "menu" | "game";
export type InventoryTab = "equipment" | "items" | "pills" | "materials";
export type GameToastTone = "default" | "success" | "danger" | "gold";

export const BREAKTHROUGH_SLOT_COUNT = 5;

export interface GameToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: GameToastTone;
  grade?: ItemGrade;
}

export interface CultivationUiState {
  breakthroughOpen: boolean;
  pickerSlotIndex: number | null;
  materialSlots: Array<string | null>;
}

export interface InventoryUiState {
  tab: InventoryTab;
  selectedEquipmentId: string | null;
  selectedEquippedSlotId: EquipmentSlotId | null;
  equipmentPage: number;
  showAttributeDetails: boolean;
  highlightSlotId: EquipmentSlotId | null;
  selectedItemIdByTab: Record<Exclude<InventoryTab, "equipment">, string | null>;
  itemPageByTab: Record<Exclude<InventoryTab, "equipment">, number>;
}

interface UiStoreState {
  screen: AppScreen;
  activeModule: PrimaryModule;
  breakthroughEffectKey: number;
  toastQueue: GameToastMessage[];
  cultivationUi: CultivationUiState;
  inventoryUi: InventoryUiState;
  setScreen: (screen: AppScreen) => void;
  setActiveModule: (module: PrimaryModule) => void;
  triggerBreakthroughBurst: () => void;
  notify: (toast: Omit<GameToastMessage, "id" | "tone"> & { tone?: GameToastTone }) => void;
  dismissToast: (id: number) => void;
  setBreakthroughOpen: (open: boolean) => void;
  setBreakthroughPickerSlot: (slotIndex: number | null) => void;
  setBreakthroughMaterial: (slotIndex: number, itemId: string | null) => void;
  resetBreakthroughUi: () => void;
  setInventoryTab: (tab: InventoryTab) => void;
  setSelectedEquipmentId: (id: string | null) => void;
  setSelectedEquippedSlotId: (slotId: EquipmentSlotId | null) => void;
  setEquipmentPage: (page: number) => void;
  setShowAttributeDetails: (open: boolean) => void;
  setHighlightSlotId: (slotId: EquipmentSlotId | null) => void;
  setSelectedItemId: (tab: Exclude<InventoryTab, "equipment">, itemId: string | null) => void;
  setItemPage: (tab: Exclude<InventoryTab, "equipment">, page: number) => void;
  resetInventorySelection: () => void;
}

function createEmptyMaterialSlots(): Array<string | null> {
  return Array.from({ length: BREAKTHROUGH_SLOT_COUNT }, () => null);
}

const initialCultivationUi: CultivationUiState = {
  breakthroughOpen: false,
  pickerSlotIndex: null,
  materialSlots: createEmptyMaterialSlots(),
};

const initialInventoryUi: InventoryUiState = {
  tab: "equipment",
  selectedEquipmentId: null,
  selectedEquippedSlotId: null,
  equipmentPage: 0,
  showAttributeDetails: false,
  highlightSlotId: null,
  selectedItemIdByTab: {
    items: null,
    pills: null,
    materials: null,
  },
  itemPageByTab: {
    items: 0,
    pills: 0,
    materials: 0,
  },
};

export const useUiStore = create<UiStoreState>((set) => ({
  screen: "menu",
  activeModule: "cultivation",
  breakthroughEffectKey: 0,
  toastQueue: [],
  cultivationUi: initialCultivationUi,
  inventoryUi: initialInventoryUi,
  setScreen: (screen) => set({ screen }),
  setActiveModule: (activeModule) => set({ activeModule }),
  triggerBreakthroughBurst: () => set((state) => ({ breakthroughEffectKey: state.breakthroughEffectKey + 1 })),
  notify: (toast) =>
    set((state) => ({
      toastQueue: [
        ...state.toastQueue.slice(-3),
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          tone: "default",
          ...toast,
        },
      ],
    })),
  dismissToast: (id) => set((state) => ({ toastQueue: state.toastQueue.filter((toast) => toast.id !== id) })),
  setBreakthroughOpen: (open) =>
    set((state) => ({
      cultivationUi: {
        ...state.cultivationUi,
        breakthroughOpen: open,
        pickerSlotIndex: open ? state.cultivationUi.pickerSlotIndex : null,
      },
    })),
  setBreakthroughPickerSlot: (pickerSlotIndex) =>
    set((state) => ({
      cultivationUi: {
        ...state.cultivationUi,
        pickerSlotIndex,
      },
    })),
  setBreakthroughMaterial: (slotIndex, itemId) =>
    set((state) => ({
      cultivationUi: {
        ...state.cultivationUi,
        pickerSlotIndex: null,
        materialSlots: state.cultivationUi.materialSlots.map((currentItemId, index) => (index === slotIndex ? itemId : currentItemId)),
      },
    })),
  resetBreakthroughUi: () => set({ cultivationUi: { ...initialCultivationUi, materialSlots: createEmptyMaterialSlots() } }),
  setInventoryTab: (tab) => set((state) => ({ inventoryUi: { ...state.inventoryUi, tab } })),
  setSelectedEquipmentId: (selectedEquipmentId) =>
    set((state) => ({
      inventoryUi: {
        ...state.inventoryUi,
        selectedEquipmentId,
      },
    })),
  setSelectedEquippedSlotId: (selectedEquippedSlotId) =>
    set((state) => ({
      inventoryUi: {
        ...state.inventoryUi,
        selectedEquippedSlotId,
      },
    })),
  setEquipmentPage: (equipmentPage) => set((state) => ({ inventoryUi: { ...state.inventoryUi, equipmentPage } })),
  setShowAttributeDetails: (showAttributeDetails) => set((state) => ({ inventoryUi: { ...state.inventoryUi, showAttributeDetails } })),
  setHighlightSlotId: (highlightSlotId) => set((state) => ({ inventoryUi: { ...state.inventoryUi, highlightSlotId } })),
  setSelectedItemId: (tab, itemId) =>
    set((state) => ({
      inventoryUi: {
        ...state.inventoryUi,
        selectedItemIdByTab: {
          ...state.inventoryUi.selectedItemIdByTab,
          [tab]: itemId,
        },
      },
    })),
  setItemPage: (tab, page) =>
    set((state) => ({
      inventoryUi: {
        ...state.inventoryUi,
        itemPageByTab: {
          ...state.inventoryUi.itemPageByTab,
          [tab]: page,
        },
      },
    })),
  resetInventorySelection: () =>
    set((state) => ({
      inventoryUi: {
        ...state.inventoryUi,
        selectedEquipmentId: null,
        selectedEquippedSlotId: null,
        selectedItemIdByTab: { items: null, pills: null, materials: null },
      },
    })),
}));

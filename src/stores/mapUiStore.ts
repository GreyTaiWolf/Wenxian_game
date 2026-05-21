import { create } from "zustand";
import type { GridCoord } from "../types";
import type { WorldProvince } from "../data/worldMap";

export type ExploreView = "world" | "region" | "location";
export type TravelIntent =
  | { kind: "free" }
  | { kind: "province"; province: WorldProvince }
  | { kind: "locationPreview"; regionId: string; locationId: string }
  | { kind: "location"; regionId: string; locationId: string };
export type LocationTravelIntent = Extract<TravelIntent, { kind: "locationPreview" | "location" }>;

export interface ActiveTravel {
  mapId: string;
  target: GridCoord;
  path: GridCoord[];
  intent: TravelIntent;
  adjusted: boolean;
}

export interface MapViewportState {
  scale: number;
  offset: {
    x: number;
    y: number;
  };
}

interface MapUiStoreState {
  view: ExploreView;
  selectedProvinceId: string | null;
  selectedRegionMarkerId: string | null;
  activeSceneHotspotId: string | null;
  debugOpen: boolean;
  debugResult: string | null;
  travel: ActiveTravel | null;
  viewportByMapId: Record<string, MapViewportState>;
  setView: (view: ExploreView) => void;
  setSelectedProvinceId: (id: string | null) => void;
  setSelectedRegionMarkerId: (id: string | null) => void;
  setActiveSceneHotspotId: (id: string | null) => void;
  setDebugOpen: (open: boolean) => void;
  toggleDebug: () => void;
  setDebugResult: (result: string | null) => void;
  setTravel: (travel: ActiveTravel | null) => void;
  setMapViewport: (mapId: string, viewport: Partial<MapViewportState>) => void;
  resetMapViewport: (mapId: string) => void;
}

export const defaultMapViewport: MapViewportState = {
  scale: 1,
  offset: { x: 0, y: 0 },
};

export const useMapUiStore = create<MapUiStoreState>((set) => ({
  view: "world",
  selectedProvinceId: null,
  selectedRegionMarkerId: null,
  activeSceneHotspotId: null,
  debugOpen: false,
  debugResult: null,
  travel: null,
  viewportByMapId: {},
  setView: (view) => set({ view }),
  setSelectedProvinceId: (selectedProvinceId) => set({ selectedProvinceId }),
  setSelectedRegionMarkerId: (selectedRegionMarkerId) => set({ selectedRegionMarkerId }),
  setActiveSceneHotspotId: (activeSceneHotspotId) => set({ activeSceneHotspotId }),
  setDebugOpen: (debugOpen) => set({ debugOpen }),
  toggleDebug: () => set((state) => ({ debugOpen: !state.debugOpen })),
  setDebugResult: (debugResult) => set({ debugResult }),
  setTravel: (travel) => set({ travel }),
  setMapViewport: (mapId, viewport) =>
    set((state) => {
      const current = state.viewportByMapId[mapId] ?? defaultMapViewport;
      return {
        viewportByMapId: {
          ...state.viewportByMapId,
          [mapId]: {
            scale: viewport.scale ?? current.scale,
            offset: viewport.offset ?? current.offset,
          },
        },
      };
    }),
  resetMapViewport: (mapId) =>
    set((state) => ({
      viewportByMapId: {
        ...state.viewportByMapId,
        [mapId]: defaultMapViewport,
      },
    })),
}));

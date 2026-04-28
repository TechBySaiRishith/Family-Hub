import { create } from "zustand";

type ViewMode = "map" | "list";

interface AppState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedCuisines: string[];
  setSelectedCuisines: (cuisines: string[]) => void;
  priceFilter: number[];
  setPriceFilter: (prices: number[]) => void;
  visitedFilter: "all" | "visited" | "unvisited";
  setVisitedFilter: (filter: "all" | "visited" | "unvisited") => void;
  addedByFilter: string;
  setAddedByFilter: (userId: string) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: "list",
  setViewMode: (mode) => set({ viewMode: mode }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCategories: [],
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  selectedCuisines: [],
  setSelectedCuisines: (cuisines) => set({ selectedCuisines: cuisines }),
  priceFilter: [],
  setPriceFilter: (prices) => set({ priceFilter: prices }),
  visitedFilter: "all",
  setVisitedFilter: (filter) => set({ visitedFilter: filter }),
  addedByFilter: "",
  setAddedByFilter: (userId) => set({ addedByFilter: userId }),
  resetFilters: () =>
    set({
      searchQuery: "",
      selectedCategories: [],
      selectedCuisines: [],
      priceFilter: [],
      visitedFilter: "all",
      addedByFilter: "",
    }),
}));

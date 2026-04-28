import { create } from "zustand";

interface CouponState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sourceAppFilter: string[];
  setSourceAppFilter: (apps: string[]) => void;
  categoryFilter: string[];
  setCategoryFilter: (cats: string[]) => void;
  expiryFilter: "all" | "urgent" | "this-week" | "this-month";
  setExpiryFilter: (f: "all" | "urgent" | "this-week" | "this-month") => void;
  hideUsed: boolean;
  setHideUsed: (v: boolean) => void;
  hidePrivate: boolean;
  setHidePrivate: (v: boolean) => void;
  resetFilters: () => void;
}

export const useCouponStore = create<CouponState>((set) => ({
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  sourceAppFilter: [],
  setSourceAppFilter: (apps) => set({ sourceAppFilter: apps }),
  categoryFilter: [],
  setCategoryFilter: (cats) => set({ categoryFilter: cats }),
  expiryFilter: "all",
  setExpiryFilter: (f) => set({ expiryFilter: f }),
  hideUsed: true,
  setHideUsed: (v) => set({ hideUsed: v }),
  hidePrivate: false,
  setHidePrivate: (v) => set({ hidePrivate: v }),
  resetFilters: () =>
    set({
      searchQuery: "",
      sourceAppFilter: [],
      categoryFilter: [],
      expiryFilter: "all",
      hideUsed: true,
      hidePrivate: false,
    }),
}));

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BRANDS, SAVED_ICONS } from "../data/catalog";
import { loadSavedSearches, persistSavedSearches } from "../storage/savedSearches";
import {
  emptyFilter,
  summarizeFilter,
  type ExtraKey,
  type FuelType,
  type SavedSearch,
  type SearchFilter,
} from "../types";

type SearchContextValue = {
  filter: SearchFilter;
  saved: SavedSearch[];
  setBrand: (brand: string, on: boolean) => void;
  clearBrands: () => void;
  setModel: (model: string, on: boolean) => void;
  clearModels: () => void;
  setFuel: (fuel: NonNullable<FuelType>, on: boolean) => void;
  clearFuels: () => void;
  setPrice: (arTol: number | null, arIg: number | null) => void;
  setYear: (evTol: number | null, evIg: number | null) => void;
  setKm: (kmTol: number | null, kmIg: number | null) => void;
  setExtra: (key: ExtraKey, on: boolean) => void;
  resetFilter: () => void;
  applySaved: (item: SavedSearch) => void;
  saveCurrent: (name?: string, icon?: string) => Promise<SavedSearch | null>;
  removeSaved: (id: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<SearchFilter>(emptyFilter);
  const [saved, setSaved] = useState<SavedSearch[]>([]);

  useEffect(() => {
    loadSavedSearches().then(setSaved);
  }, []);

  useEffect(() => {
    void persistSavedSearches(saved);
  }, [saved]);

  const setBrand = useCallback((brand: string, on: boolean) => {
    setFilter((prev) => {
      let list = [...prev.gyartmanyok];
      if (on) {
        if (!list.includes(brand)) list.push(brand);
      } else {
        list = list.filter((b) => b !== brand);
      }
      list.sort();
      const allowed = new Set(list.flatMap((b) => BRANDS[b] ?? []));
      return {
        ...prev,
        gyartmanyok: list,
        modellek: prev.modellek.filter((m) => allowed.has(m)),
      };
    });
  }, []);

  const clearBrands = useCallback(() => {
    setFilter((prev) => ({ ...prev, gyartmanyok: [], modellek: [] }));
  }, []);

  const setModel = useCallback((model: string, on: boolean) => {
    setFilter((prev) => {
      let list = [...prev.modellek];
      if (on) {
        if (!list.includes(model)) list.push(model);
      } else {
        list = list.filter((m) => m !== model);
      }
      return { ...prev, modellek: list.sort() };
    });
  }, []);

  const clearModels = useCallback(() => {
    setFilter((prev) => ({ ...prev, modellek: [] }));
  }, []);

  const setFuel = useCallback((fuel: NonNullable<FuelType>, on: boolean) => {
    setFilter((prev) => {
      let list = [...prev.fuels];
      if (on) {
        if (!list.includes(fuel)) list.push(fuel);
      } else {
        list = list.filter((f) => f !== fuel);
      }
      const order: NonNullable<FuelType>[] = [
        "benzin",
        "diesel",
        "hybrid",
        "elektromos",
        "benzin-gaz",
      ];
      return { ...prev, fuels: order.filter((f) => list.includes(f)) };
    });
  }, []);

  const clearFuels = useCallback(() => {
    setFilter((prev) => ({ ...prev, fuels: [] }));
  }, []);

  const setPrice = useCallback((arTol: number | null, arIg: number | null) => {
    setFilter((prev) => ({ ...prev, arTol, arIg }));
  }, []);

  const setYear = useCallback((evTol: number | null, evIg: number | null) => {
    setFilter((prev) => ({ ...prev, evTol, evIg }));
  }, []);

  const setKm = useCallback((kmTol: number | null, kmIg: number | null) => {
    setFilter((prev) => ({ ...prev, kmTol, kmIg }));
  }, []);

  const setExtra = useCallback((key: ExtraKey, on: boolean) => {
    setFilter((prev) => ({
      ...prev,
      extras: { ...prev.extras, [key]: on },
    }));
  }, []);

  const resetFilter = useCallback(() => setFilter(emptyFilter()), []);

  const applySaved = useCallback((item: SavedSearch) => {
    setFilter({ ...item.filter, extras: { ...item.filter.extras } });
  }, []);

  const saveCurrent = useCallback(
    async (name?: string, icon?: string) => {
      const summary = summarizeFilter(filter);
      if (summary === "Nincs szűrő") return null;
      const item: SavedSearch = {
        id: `${Date.now()}`,
        name: name?.trim() || summary,
        icon: icon || SAVED_ICONS[saved.length % SAVED_ICONS.length],
        filter: {
          ...filter,
          extras: { ...filter.extras },
        },
        createdAt: new Date().toISOString(),
      };
      setSaved((prev) => [item, ...prev].slice(0, 12));
      return item;
    },
    [filter, saved.length],
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      filter,
      saved,
      setBrand,
      clearBrands,
      setModel,
      clearModels,
      setFuel,
      clearFuels,
      setPrice,
      setYear,
      setKm,
      setExtra,
      resetFilter,
      applySaved,
      saveCurrent,
      removeSaved,
    }),
    [
      filter,
      saved,
      setBrand,
      clearBrands,
      setModel,
      clearModels,
      setFuel,
      clearFuels,
      setPrice,
      setYear,
      setKm,
      setExtra,
      resetFilter,
      applySaved,
      saveCurrent,
      removeSaved,
    ],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch outside SearchProvider");
  return ctx;
}

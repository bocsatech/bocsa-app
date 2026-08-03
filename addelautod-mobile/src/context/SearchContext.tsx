import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SAVED_ICONS } from "../data/catalog";
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
  setBrand: (brand: string | null) => void;
  setModel: (model: string | null) => void;
  setFuel: (fuel: FuelType) => void;
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

  const setBrand = useCallback((brand: string | null) => {
    setFilter((prev) => ({
      ...prev,
      gyartmany: brand,
      modell: brand === prev.gyartmany ? prev.modell : null,
    }));
  }, []);

  const setModel = useCallback((model: string | null) => {
    setFilter((prev) => ({ ...prev, modell: model }));
  }, []);

  const setFuel = useCallback((fuel: FuelType) => {
    setFilter((prev) => ({ ...prev, fuel }));
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
      setModel,
      setFuel,
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
      setModel,
      setFuel,
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

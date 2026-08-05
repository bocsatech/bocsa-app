import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedSearch } from "../types";

const KEY = "addelautod.savedSearches.v1";

export async function loadSavedSearches(): Promise<SavedSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function persistSavedSearches(items: SavedSearch[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

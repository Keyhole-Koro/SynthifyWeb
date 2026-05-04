import type { ExpansionMap } from '@keyhole-koro/paper-in-paper';

const STORAGE_KEY = 'synthify_expansion_map';
const FOCUS_KEY = 'synthify_focused_item_id';

export function saveExpansionMap(map: ExpansionMap) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save expansion map to localStorage', e);
  }
}

export function loadExpansionMap(): ExpansionMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    const entries = JSON.parse(serialized);
    return new Map(entries);
  } catch (e) {
    console.error('Failed to load expansion map from localStorage', e);
    return null;
  }
}

export function saveFocusedItemId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id === null) {
    localStorage.removeItem(FOCUS_KEY);
  } else {
    localStorage.setItem(FOCUS_KEY, id);
  }
}

export function loadFocusedItemId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(FOCUS_KEY);
}

export function clearExpansionMap() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(FOCUS_KEY);
}

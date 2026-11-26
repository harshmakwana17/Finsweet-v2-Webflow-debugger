import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import type { ExtensionSettings, HistoryEntry } from './types';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in sandboxed Designer contexts.
  }
}

export function loadSettings(): ExtensionSettings {
  return readJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: ExtensionSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const history = [entry, ...loadHistory()].slice(0, 30);
  writeJson(STORAGE_KEYS.history, history);
  return history;
}

export function clearHistory(): void {
  writeJson(STORAGE_KEYS.history, []);
}

export function loadReviewed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reviewed);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function saveReviewed(ids: string[]): void {
  writeJson(STORAGE_KEYS.reviewed, ids);
}

import type { UserStore } from './types';

const STORAGE_KEY = 'kuroyuki.blue-archive-growth-tracker.v1';

export interface LoadResult {
  data: UserStore;
  error: string | null;
}

export function createEmptyStore(maxSenseiLevel: number): UserStore {
  return {
    schemaVersion: 1,
    account: { senseiLevel: maxSenseiLevel },
    characters: [],
  };
}

export function loadStore(maxSenseiLevel: number): LoadResult {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { data: createEmptyStore(maxSenseiLevel), error: null };
    }

    const parsed = JSON.parse(saved) as UserStore;
    if (
      parsed.schemaVersion !== 1 ||
      !parsed.account ||
      !Number.isInteger(parsed.account.senseiLevel) ||
      !Array.isArray(parsed.characters)
    ) {
      return {
        data: createEmptyStore(maxSenseiLevel),
        error: '保存データの形式を読み取れませんでした。データは上書きしていません。',
      };
    }

    return { data: parsed, error: null };
  } catch {
    return {
      data: createEmptyStore(maxSenseiLevel),
      error: 'ブラウザーの保存データを読み取れませんでした。保存機能を確認してください。',
    };
  }
}

export function saveStore(store: UserStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

import { DEMO_STORAGE_KEYS } from './demoMode';
import { seedState, type DemoState } from './mockData';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEYS.state);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    // fall through to seed
  }
  return clone(seedState());
}

let state: DemoState = load();

function persist(): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEYS.state, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, quota) — demo still works in-memory for this tab
  }
}

export function getState(): DemoState {
  return state;
}

/** Mutate the demo state in place, then persist. `fn` may freely push/splice/edit nested arrays. */
export function mutate<T>(fn: (draft: DemoState) => T): T {
  const result = fn(state);
  persist();
  return result;
}

export function resetDemoState(): void {
  state = clone(seedState());
  try {
    localStorage.removeItem(DEMO_STORAGE_KEYS.state);
  } catch {
    // ignore
  }
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${uidCounter}`;
}

import { initialState } from "./initialState";
import type { Checkpoint, GameState } from "./types";

export const STORAGE_KEY = "logout-game-state-v1";
const checkpoints: Checkpoint[] = ["village", "world", "dungeon", "castle-1", "castle-2", "boss", "secret", "rescue", "clear"];

export function loadGameState(storage: Pick<Storage, "getItem"> = localStorage): GameState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== 1) return initialState;
    return {
      ...initialState,
      ...parsed,
      visitedPages: { ...initialState.visitedPages, ...parsed.visitedPages },
      collectedLetters: { ...initialState.collectedLetters, ...parsed.collectedLetters },
      inventory: { ...initialState.inventory, ...parsed.inventory, selectedItem: null },
      shop: { ...initialState.shop, ...parsed.shop },
      news: { ...initialState.news, ...parsed.news },
      sports: { ...initialState.sports, ...parsed.sports },
      adGame: {
        ...initialState.adGame,
        ...parsed.adGame,
        checkpoint: checkpoints.includes(parsed.adGame?.checkpoint as Checkpoint) ? parsed.adGame!.checkpoint as Checkpoint : "village",
      },
      browser: { ...initialState.browser, ...parsed.browser },
    };
  } catch {
    return initialState;
  }
}

export function saveGameState(state: GameState, storage: Pick<Storage, "setItem"> = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, inventory: { ...state.inventory, selectedItem: null } }));
}

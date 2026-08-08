import { initialState } from "./initialState";
import type { GameAction, GameState } from "./types";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "NAVIGATE": {
      if (action.page === state.currentPage) return state;
      const history = state.virtualHistory.slice(0, state.historyIndex + 1).concat(action.page);
      return {
        ...state,
        currentPage: action.page,
        virtualHistory: history,
        historyIndex: history.length - 1,
        visitedPages: action.page === "portal" ? state.visitedPages : { ...state.visitedPages, [action.page]: true },
      };
    }
    case "HISTORY_BACK": {
      if (state.historyIndex === 0) return state;
      const historyIndex = state.historyIndex - 1;
      return { ...state, historyIndex, currentPage: state.virtualHistory[historyIndex] };
    }
    case "HISTORY_FORWARD": {
      if (state.historyIndex >= state.virtualHistory.length - 1) return state;
      const historyIndex = state.historyIndex + 1;
      return { ...state, historyIndex, currentPage: state.virtualHistory[historyIndex] };
    }
    case "SET_DARK_MODE":
      return { ...state, browser: { ...state.browser, darkMode: action.value } };
    case "SET_ZOOM":
      return { ...state, browser: { ...state.browser, zoomPercent: action.value } };
    case "SET_INVENTORY_PINNED":
      return { ...state, browser: { ...state.browser, inventoryPinned: action.value } };
    case "SELECT_ITEM":
      return { ...state, inventory: { ...state.inventory, selectedItem: action.item } };
    case "COLLECT_WATER":
      if (state.inventory.water !== "missing") return state;
      return { ...state, inventory: { ...state.inventory, water: "owned" }, shop: { ...state.shop, waterCollected: true } };
    case "BUY_KEY":
      if (state.inventory.banknote !== "owned" || state.inventory.key !== "missing") return state;
      return {
        ...state,
        inventory: { ...state.inventory, banknote: "used", key: "owned", selectedItem: null },
      };
    case "OPEN_CARD_DETAIL":
      return { ...state, shop: { ...state.shop, cardDetailOpened: true } };
    case "REVEAL_HIDDEN_STOCK":
      return { ...state, shop: { ...state.shop, hiddenStockRevealed: true } };
    case "COLLECT_LETTER":
      if (state.collectedLetters[action.clue]) return state;
      return { ...state, collectedLetters: { ...state.collectedLetters, [action.clue]: true } };
    case "EXTINGUISH_FIRE":
      if (state.inventory.water !== "owned") return state;
      return {
        ...state,
        inventory: { ...state.inventory, water: "used", selectedItem: null },
        news: { fireExtinguished: true },
      };
    case "START_MATCH":
      return {
        ...state,
        sports: { ...state.sports, prediction: action.prediction, simulationCompleted: false, predictionWasCorrect: null },
      };
    case "FINISH_MATCH":
      if (!state.sports.prediction) return state;
      {
        const predictionWasCorrect = state.sports.prediction === "home";
        return {
          ...state,
          inventory: {
            ...state.inventory,
            banknote: predictionWasCorrect && state.inventory.banknote === "missing" ? "owned" : state.inventory.banknote,
          },
          sports: {
            ...state.sports,
            simulationCompleted: true,
            predictionWasCorrect,
            rewardGranted: state.sports.rewardGranted || predictionWasCorrect,
            specialAddressUnlocked: state.sports.specialAddressUnlocked || predictionWasCorrect,
            attempts: state.sports.attempts + 1,
          },
        };
      }
    case "RETRY_MATCH":
      return {
        ...state,
        sports: {
          ...state.sports,
          prediction: null,
          simulationCompleted: false,
          predictionWasCorrect: null,
        },
      };
    case "USE_KEY":
      if (state.inventory.key !== "owned") return state;
      return {
        ...state,
        inventory: { ...state.inventory, key: "used", selectedItem: null },
        adGame: { ...state.adGame, keyUsed: true },
      };
    case "SET_CHECKPOINT":
      return { ...state, adGame: { ...state.adGame, checkpoint: action.checkpoint } };
    case "DEFEAT_BOSS":
      return { ...state, adGame: { ...state.adGame, bossDefeated: true, checkpoint: "rescue" } };
    case "RESCUE_PRINCESS":
      return { ...state, adGame: { ...state.adGame, princessRescued: true, checkpoint: "clear" } };
    case "REPLAY_ADVENTURE":
      return { ...state, adGame: { ...state.adGame, checkpoint: "start" } };
    case "MARK_ENDING_SEEN":
      return { ...state, endingSeen: true };
    case "RESET_GAME":
      return initialState;
    default:
      return state;
  }
}

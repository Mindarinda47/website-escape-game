import type { GameState } from "./types";

export const initialState: GameState = {
  version: 1,
  currentPage: "portal",
  virtualHistory: ["portal"],
  historyIndex: 0,
  visitedPages: { news: false, shop: false, sports: false, "ad-game": false },
  collectedLetters: {
    "shop-t": false,
    "shop-l": false,
    "news-o": false,
    "sports-o": false,
    "game-g": false,
    "game-u": false,
  },
  inventory: { water: "missing", coin: "missing", selectedItem: null },
  shop: { waterCollected: false, cardDetailOpened: false, hiddenStockRevealed: false },
  news: { fireExtinguished: false },
  sports: {
    prediction: null,
    simulationCompleted: false,
    predictionWasCorrect: null,
    coinGranted: false,
    specialAddressUnlocked: false,
  },
  adGame: {
    coinInserted: false,
    checkpoint: "start",
    bossDefeated: false,
    princessRescued: false,
  },
  browser: { darkMode: false, zoomPercent: 100, inventoryPinned: false },
  completionNotified: { news: false, shop: false, sports: false, "ad-game": false },
  endingSeen: false,
};

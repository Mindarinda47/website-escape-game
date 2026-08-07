import { gameReducer } from "../state/gameReducer";
import { initialState } from "../state/initialState";
import { selectPageCompleted } from "../state/selectors";
import type { GameAction, GameState } from "../state/types";

function reduce(actions: GameAction[], start: GameState = initialState): GameState {
  return actions.reduce(gameReducer, start);
}

describe("game reducer", () => {
  it("keeps puzzle state while navigating virtual history", () => {
    const state = reduce([
      { type: "COLLECT_WATER" },
      { type: "NAVIGATE", page: "news" },
      { type: "NAVIGATE", page: "sports" },
      { type: "HISTORY_BACK" },
    ]);
    expect(state.currentPage).toBe("news");
    expect(state.inventory.water).toBe("owned");
    expect(state.visitedPages.news).toBe(true);
    expect(state.visitedPages.sports).toBe(true);
  });

  it("supports the shop-news branch even when news is visited first", () => {
    const state = reduce([
      { type: "NAVIGATE", page: "news" },
      { type: "EXTINGUISH_FIRE" },
      { type: "NAVIGATE", page: "shop" },
      { type: "COLLECT_WATER" },
      { type: "COLLECT_LETTER", clue: "shop-t" },
      { type: "COLLECT_LETTER", clue: "shop-l" },
      { type: "NAVIGATE", page: "news" },
      { type: "SELECT_ITEM", item: "water" },
      { type: "EXTINGUISH_FIRE" },
      { type: "COLLECT_LETTER", clue: "news-o" },
    ]);
    expect(selectPageCompleted(state, "shop")).toBe(true);
    expect(selectPageCompleted(state, "news")).toBe(true);
    expect(state.inventory.water).toBe("used");
  });

  it("grants a coin for a wrong prediction and completes the game branch", () => {
    const state = reduce([
      { type: "START_MATCH", prediction: "away" },
      { type: "FINISH_MATCH" },
      { type: "COLLECT_LETTER", clue: "sports-o" },
      { type: "SELECT_ITEM", item: "coin" },
      { type: "INSERT_COIN" },
      { type: "COLLECT_LETTER", clue: "game-u" },
      { type: "DEFEAT_BOSS" },
      { type: "COLLECT_LETTER", clue: "game-g" },
      { type: "RESCUE_PRINCESS" },
    ]);
    expect(state.sports.predictionWasCorrect).toBe(false);
    expect(state.sports.coinGranted).toBe(true);
    expect(selectPageCompleted(state, "sports")).toBe(true);
    expect(selectPageCompleted(state, "ad-game")).toBe(true);
  });
});

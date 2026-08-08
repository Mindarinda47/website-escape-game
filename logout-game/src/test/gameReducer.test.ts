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
      { type: "START_MATCH", prediction: "home" },
      { type: "FINISH_MATCH" },
      { type: "BUY_KEY" },
      { type: "NAVIGATE", page: "news" },
      { type: "SELECT_ITEM", item: "water" },
      { type: "EXTINGUISH_FIRE" },
      { type: "COLLECT_LETTER", clue: "news-o" },
    ]);
    expect(selectPageCompleted(state, "shop")).toBe(true);
    expect(selectPageCompleted(state, "news")).toBe(true);
    expect(state.inventory.water).toBe("used");
  });

  it("only grants the banknote for a correct retry and uses it to buy the game key", () => {
    const failedState = reduce([
      { type: "START_MATCH", prediction: "away" },
      { type: "FINISH_MATCH" },
    ]);
    expect(failedState.sports.predictionWasCorrect).toBe(false);
    expect(failedState.sports.rewardGranted).toBe(false);
    expect(failedState.sports.attempts).toBe(1);
    expect(failedState.inventory.banknote).toBe("missing");

    const state = reduce([
      { type: "RETRY_MATCH" },
      { type: "START_MATCH", prediction: "home" },
      { type: "FINISH_MATCH" },
      { type: "COLLECT_LETTER", clue: "sports-o" },
      { type: "BUY_KEY" },
      { type: "SELECT_ITEM", item: "key" },
      { type: "USE_KEY" },
      { type: "COLLECT_LETTER", clue: "game-u" },
      { type: "DEFEAT_BOSS" },
      { type: "COLLECT_LETTER", clue: "game-g" },
      { type: "RESCUE_PRINCESS" },
    ], failedState);
    expect(state.sports.predictionWasCorrect).toBe(true);
    expect(state.sports.rewardGranted).toBe(true);
    expect(state.sports.attempts).toBe(2);
    expect(state.inventory.banknote).toBe("used");
    expect(state.inventory.key).toBe("used");
    expect(selectPageCompleted(state, "sports")).toBe(true);
    expect(selectPageCompleted(state, "ad-game")).toBe(true);
  });
});

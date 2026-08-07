import { initialState } from "../state/initialState";
import { isEndingAnswer, normalizeAnswer, selectCollectedLetters, selectPageCompleted } from "../state/selectors";

describe("answer normalization", () => {
  it.each(["LOGOUT", "logout", "LOG OUT", " /logout ", "로그아웃"])("accepts %s", (value) => {
    expect(isEndingAnswer(value)).toBe(true);
  });

  it("normalizes spaces, case and one leading slash", () => {
    expect(normalizeAnswer(" /Log Out ")).toBe("logout");
  });

  it("rejects unrelated searches", () => {
    expect(isEndingAnswer("login")).toBe(false);
  });
});

describe("derived page completion", () => {
  it("requires each page's concrete progress flags", () => {
    const completed = {
      ...initialState,
      inventory: { ...initialState.inventory, water: "used" as const, coin: "used" as const },
      collectedLetters: Object.fromEntries(Object.keys(initialState.collectedLetters).map((clue) => [clue, true])) as typeof initialState.collectedLetters,
      news: { fireExtinguished: true },
      sports: { ...initialState.sports, simulationCompleted: true, coinGranted: true },
      adGame: { ...initialState.adGame, coinInserted: true, bossDefeated: true, princessRescued: true },
    };
    expect(selectPageCompleted(completed, "shop")).toBe(true);
    expect(selectPageCompleted(completed, "news")).toBe(true);
    expect(selectPageCompleted(completed, "sports")).toBe(true);
    expect(selectPageCompleted(completed, "ad-game")).toBe(true);
  });

  it("shows clues in a fixed scrambled order", () => {
    const state = { ...initialState, collectedLetters: Object.fromEntries(Object.keys(initialState.collectedLetters).map((clue) => [clue, true])) as typeof initialState.collectedLetters };
    expect(selectCollectedLetters(state)).toEqual(["game-u", "shop-l", "sports-o", "shop-t", "game-g", "news-o"]);
  });
});

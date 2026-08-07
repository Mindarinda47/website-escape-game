import type { ContentPageId, GameState, LetterClueId, PageId } from "./types";

export const letterValues: Record<LetterClueId, string> = {
  "shop-t": "T",
  "shop-l": "L",
  "news-o": "O",
  "sports-o": "O",
  "game-g": "G",
  "game-u": "U",
};

export const pageLetters: Record<ContentPageId, LetterClueId[]> = {
  shop: ["shop-t", "shop-l"],
  news: ["news-o"],
  sports: ["sports-o"],
  "ad-game": ["game-g", "game-u"],
};

export const pageTitles: Record<PageId, string> = {
  portal: "GOGLE",
  news: "새벽일보",
  shop: "GOGLE SHOP",
  sports: "하프타임 스포츠",
  "ad-game": "빛의 모험",
};

export const pageAddresses: Record<PageId, string> = {
  portal: "portal.local/home",
  news: "portal.local/news/today",
  shop: "portal.local/shop",
  sports: "portal.local/sports",
  "ad-game": "portal.local/ads/hero",
};

export function selectPageCompleted(state: GameState, page: ContentPageId): boolean {
  if (page === "shop") {
    return state.inventory.water !== "missing" && state.collectedLetters["shop-t"] && state.collectedLetters["shop-l"];
  }
  if (page === "news") return state.news.fireExtinguished && state.collectedLetters["news-o"];
  if (page === "sports") {
    return state.sports.simulationCompleted && state.sports.coinGranted && state.collectedLetters["sports-o"];
  }
  return state.adGame.coinInserted && state.adGame.bossDefeated && state.adGame.princessRescued && state.collectedLetters["game-g"] && state.collectedLetters["game-u"];
}

export function selectPageProgress(state: GameState, page: ContentPageId): [number, number] {
  const clues = pageLetters[page];
  return [clues.filter((clue) => state.collectedLetters[clue]).length, clues.length];
}

export function selectCollectedLetters(state: GameState): LetterClueId[] {
  const displayOrder: LetterClueId[] = ["game-u", "shop-l", "sports-o", "shop-t", "game-g", "news-o"];
  return displayOrder.filter((clue) => state.collectedLetters[clue]);
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "").replace(/^\//, "");
}

export function isEndingAnswer(value: string): boolean {
  const normalized = normalizeAnswer(value);
  return normalized === "logout" || normalized === "로그아웃";
}

import type { ContentPageId } from "../state/types";

export const completionCopy: Record<ContentPageId, string> = {
  shop: "잠시 멈춰 있어도, 당신의 가치가 줄어드는 것은 아닙니다.",
  news: "불안이 시야를 가려도, 길까지 사라진 건 아닙니다.",
  sports: "결과를 몰라도, 선택한 순간 경기는 시작됩니다.",
  "ad-game": "완벽히 준비되지 않아도, 다시 한 걸음 내디딜 수 있습니다.",
};

export const contentPageNames: Record<ContentPageId, string> = {
  shop: "GOGLE SHOP",
  news: "새벽일보",
  sports: "하프타임 스포츠",
  "ad-game": "빛의 모험",
};

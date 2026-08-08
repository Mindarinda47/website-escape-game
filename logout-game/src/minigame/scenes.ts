import type { Checkpoint } from "../state/types";
import type { SceneDefinition } from "./types";

export const scenes: Record<Checkpoint, SceneDefinition> = {
  village: {
    title: "새벽바람 마을",
    objective: "마을 사람들과 대화하고 동쪽 길로 나가세요.",
    ground: "village",
    spawn: { x: 170, y: 350 },
    obstacles: [
      { x: 55, y: 75, width: 190, height: 125 },
      { x: 470, y: 65, width: 205, height: 145 },
      { x: 300, y: 218, width: 92, height: 58 },
      { x: 80, y: 410, width: 285, height: 22 },
    ],
    exits: [{ rect: { x: 742, y: 175, width: 26, height: 130 }, to: "world", spawn: { x: 58, y: 245 }, label: "초원길" }],
  },
  world: {
    title: "바람결 초원",
    objective: "마을, 수련 동굴, 북쪽 성으로 이어지는 길이 펼쳐져 있습니다.",
    ground: "grass",
    spawn: { x: 58, y: 245 },
    obstacles: [
      { x: 115, y: 48, width: 65, height: 82 }, { x: 215, y: 40, width: 54, height: 74 },
      { x: 315, y: 65, width: 72, height: 64 }, { x: 430, y: 30, width: 58, height: 94 },
      { x: 560, y: 60, width: 58, height: 72 }, { x: 96, y: 330, width: 70, height: 76 },
      { x: 210, y: 360, width: 58, height: 68 }, { x: 330, y: 338, width: 65, height: 82 },
      { x: 465, y: 362, width: 54, height: 66 }, { x: 592, y: 330, width: 68, height: 84 },
      { x: 685, y: 322, width: 42, height: 66 },
    ],
    exits: [
      { rect: { x: 0, y: 175, width: 28, height: 135 }, to: "village", spawn: { x: 710, y: 245 }, label: "새벽바람 마을" },
      { rect: { x: 145, y: 45, width: 92, height: 35 }, to: "dungeon", spawn: { x: 384, y: 420 }, label: "메아리 동굴" },
      { rect: { x: 610, y: 45, width: 112, height: 35 }, to: "boss", spawn: { x: 384, y: 420 }, label: "검은 성", requiresLevel: 3, requiresGreatSword: true },
      { rect: { x: 738, y: 390, width: 30, height: 70 }, to: "secret", spawn: { x: 55, y: 245 }, label: "이름 없는 숲", hidden: true },
    ],
  },
  dungeon: {
    title: "메아리 동굴",
    objective: "마물들을 쓰러뜨려 EXP와 골드를 모으세요. 적은 잠시 뒤 다시 나타납니다.",
    ground: "dungeon",
    spawn: { x: 384, y: 420 },
    obstacles: [
      { x: 125, y: 105, width: 72, height: 72 }, { x: 570, y: 105, width: 72, height: 72 },
      { x: 285, y: 225, width: 58, height: 58 }, { x: 425, y: 225, width: 58, height: 58 },
      { x: 110, y: 315, width: 86, height: 46 }, { x: 572, y: 315, width: 86, height: 46 },
    ],
    exits: [{ rect: { x: 320, y: 452, width: 128, height: 28 }, to: "world", spawn: { x: 190, y: 120 }, label: "초원으로" }],
  },
  boss: {
    title: "검은 성 알현실",
    objective: "성주 모르가스를 쓰러뜨리고 공주가 갇힌 문을 여세요.",
    ground: "castle",
    spawn: { x: 384, y: 420 },
    obstacles: [
      { x: 92, y: 92, width: 62, height: 120 }, { x: 614, y: 92, width: 62, height: 120 },
      { x: 92, y: 290, width: 62, height: 90 }, { x: 614, y: 290, width: 62, height: 90 },
    ],
    exits: [{ rect: { x: 320, y: 452, width: 128, height: 28 }, to: "world", spawn: { x: 665, y: 120 }, label: "초원으로" }],
  },
  secret: {
    title: "이름 없는 숲",
    objective: "숲 가장 깊은 곳에서 희미한 문자가 숨 쉬고 있습니다.",
    ground: "secret",
    spawn: { x: 55, y: 245 },
    obstacles: [
      { x: 80, y: 52, width: 90, height: 80 }, { x: 80, y: 350, width: 90, height: 80 },
      { x: 250, y: 80, width: 72, height: 90 }, { x: 250, y: 310, width: 72, height: 90 },
      { x: 410, y: 45, width: 80, height: 100 }, { x: 410, y: 335, width: 80, height: 100 },
    ],
    exits: [{ rect: { x: 0, y: 190, width: 28, height: 110 }, to: "world", spawn: { x: 705, y: 414 }, label: "초원으로" }],
  },
  rescue: {
    title: "별빛 탑",
    objective: "공주 곁에 놓인 G의 방패를 마우스로 선택하세요.",
    ground: "rescue",
    spawn: { x: 180, y: 300 },
    obstacles: [],
    exits: [],
  },
  clear: {
    title: "모험 완료",
    objective: "G의 방패가 바깥 세계의 단서가 되었습니다.",
    ground: "rescue",
    spawn: { x: 384, y: 360 },
    obstacles: [],
    exits: [],
  },
};

export const sceneCopy = Object.fromEntries(Object.entries(scenes).map(([key, scene]) => [key, { title: scene.title, objective: scene.objective }])) as Record<Checkpoint, { title: string; objective: string }>;

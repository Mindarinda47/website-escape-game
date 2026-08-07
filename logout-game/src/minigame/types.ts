import type { Checkpoint } from "../state/types";

export type Vec2 = { x: number; y: number };
export type Actor = Vec2 & { radius: number; hp: number };
export type AdventureRuntime = {
  scene: Checkpoint;
  player: Actor;
  enemies: Actor[];
  boss: Actor | null;
  switchHits: number;
  attackFlash: number;
  invulnerableUntil: number;
};

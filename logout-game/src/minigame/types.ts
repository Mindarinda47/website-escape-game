import type { Checkpoint } from "../state/types";

export type Vec2 = { x: number; y: number };
export type Rect = Vec2 & { width: number; height: number };
export type Direction = "down" | "left" | "right" | "up";
export type EnemyKind = "melee" | "ranged" | "boss";

export type Actor = Vec2 & { radius: number; hp: number; maxHp: number };
export type PlayerActor = Actor & { direction: Direction; moving: boolean; walkTime: number };
export type EnemyActor = Actor & {
  id: string;
  kind: EnemyKind;
  cooldown: number;
  patternTime: number;
  phase: number;
};
export type Projectile = Vec2 & { vx: number; vy: number; radius: number; life: number; hostile: boolean };

export type AdventureRuntime = {
  scene: Checkpoint;
  player: PlayerActor;
  enemies: EnemyActor[];
  projectiles: Projectile[];
  attackTimer: number;
  attackCooldown: number;
  invulnerableUntil: number;
  elapsed: number;
  respawnTimer: number;
};

export type SceneExit = {
  rect: Rect;
  to: Checkpoint;
  spawn: Vec2;
  label: string;
  hidden?: boolean;
  requiresLevel?: number;
  requiresGreatSword?: boolean;
};

export type SceneDefinition = {
  title: string;
  objective: string;
  ground: "village" | "grass" | "dungeon" | "castle" | "secret" | "rescue";
  width: number;
  height: number;
  spawn: Vec2;
  obstacles: Rect[];
  exits: SceneExit[];
};

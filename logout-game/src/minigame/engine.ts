import type { Actor, AdventureRuntime, Vec2 } from "./types";

export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 360;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function actor(x: number, y: number, radius = 14, hp = 1): Actor {
  return { x, y, radius, hp };
}

export function createRuntime(scene: AdventureRuntime["scene"]): AdventureRuntime {
  return {
    scene,
    player: actor(68, 180, 13, 1),
    enemies: scene === "start" ? [actor(340, 112), actor(430, 255), actor(510, 145)] : [],
    boss: scene === "boss" ? actor(470, 180, 34, 3) : null,
    switchHits: 0,
    attackFlash: 0,
    invulnerableUntil: 0,
  };
}

export function movePlayer(runtime: AdventureRuntime, keys: Set<string>, delta: number): void {
  const speed = 150 * delta;
  const horizontal = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
  const vertical = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
  const length = Math.hypot(horizontal, vertical) || 1;
  runtime.player.x = clamp(runtime.player.x + (horizontal / length) * speed, 24, CANVAS_WIDTH - 24);
  runtime.player.y = clamp(runtime.player.y + (vertical / length) * speed, 54, CANVAS_HEIGHT - 24);
}

export function moveEnemies(runtime: AdventureRuntime, delta: number): void {
  for (const enemy of runtime.enemies) {
    const dx = runtime.player.x - enemy.x;
    const dy = runtime.player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / length) * 38 * delta;
    enemy.y += (dy / length) * 38 * delta;
  }
}

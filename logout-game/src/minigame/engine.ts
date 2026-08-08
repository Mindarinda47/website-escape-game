import { scenes } from "./scenes";
import type { Actor, AdventureRuntime, Direction, EnemyActor, EnemyKind, Rect, Vec2 } from "./types";

export const CANVAS_WIDTH = 768;
export const CANVAS_HEIGHT = 480;
export const PLAYER_MOVE_SPEED = 180;
export const RUN_SPEED_MULTIPLIER = 1.65;
export const BOSS_FIRE_CHARGE_DURATION = 2;
export const BOSS_FIRE_AIM_LOCK_DURATION = 0.45;
export const BOSS_FIRE_DURATION = 3;
export const BOSS_FIRE_LENGTH = 520;
export const BOSS_FIRE_WIDTH = 56;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function directionVector(direction: Direction): Vec2 {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function enemy(id: string, kind: EnemyKind, x: number, y: number): EnemyActor {
  const maxHp = kind === "boss" ? 30 : 3;
  return {
    id, kind, x, y, radius: kind === "boss" ? 42 : 16, hp: maxHp, maxHp, cooldown: 0.5,
    patternTime: 0, phase: Math.random() * Math.PI * 2, specialPhase: "idle", specialTimer: 0,
    specialCooldown: kind === "boss" ? 4 : 0, specialAngle: 0,
  };
}

export function createEnemies(scene: AdventureRuntime["scene"]): EnemyActor[] {
  if (scene === "dungeon") {
    return [
      enemy("blade-1", "melee", 185, 620), enemy("blade-2", "melee", 650, 330), enemy("blade-3", "melee", 930, 850),
      enemy("blade-4", "melee", 1450, 620), enemy("blade-5", "melee", 1780, 1120), enemy("blade-6", "melee", 650, 1210),
      enemy("wisp-1", "ranged", 390, 860), enemy("wisp-2", "ranged", 1190, 300), enemy("wisp-3", "ranged", 1680, 860),
      enemy("wisp-4", "ranged", 1350, 1420),
    ];
  }
  if (scene === "castle-1") {
    return [enemy("guard-1", "melee", 300, 470), enemy("guard-2", "melee", 1180, 430), enemy("seer-1", "ranged", 750, 650)];
  }
  if (scene === "castle-2") {
    return [enemy("guard-3", "melee", 330, 700), enemy("guard-4", "melee", 1170, 700), enemy("seer-2", "ranged", 350, 250), enemy("seer-3", "ranged", 1150, 250)];
  }
  if (scene === "boss") return [enemy("morgas", "boss", 650, 230)];
  return [];
}

export function createRuntime(scene: AdventureRuntime["scene"], hp = 6, maxHp = 6, spawn = scenes[scene].spawn): AdventureRuntime {
  const safeSpawn = resolveSafeSpawn(scene, spawn, 14);
  return {
    scene,
    player: { ...safeSpawn, radius: 14, hp, maxHp, direction: "down", moving: false, walkTime: 0 },
    enemies: createEnemies(scene),
    projectiles: [],
    attackTimer: 0,
    attackCooldown: 0,
    invulnerableUntil: 0,
    elapsed: 0,
    respawnTimer: 0,
  };
}

function circleHitsRect(x: number, y: number, radius: number, rect: Rect): boolean {
  const nearestX = clamp(x, rect.x, rect.x + rect.width);
  const nearestY = clamp(y, rect.y, rect.y + rect.height);
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function canOccupy(actor: Pick<Actor, "radius">, x: number, y: number, obstacles: Rect[], width: number, height: number): boolean {
  if (x < actor.radius || x > width - actor.radius || y < actor.radius || y > height - actor.radius) return false;
  return !obstacles.some((rect) => circleHitsRect(x, y, actor.radius, rect));
}

export function resolveSafeSpawn(scene: AdventureRuntime["scene"], spawn: Vec2, radius: number): Vec2 {
  const definition = scenes[scene];
  const actor = { radius };
  if (canOccupy(actor, spawn.x, spawn.y, definition.obstacles, definition.width, definition.height)) return { ...spawn };
  for (let range = 16; range <= 192; range += 16) {
    for (let y = -range; y <= range; y += 16) {
      for (let x = -range; x <= range; x += 16) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== range) continue;
        const candidate = { x: spawn.x + x, y: spawn.y + y };
        if (canOccupy(actor, candidate.x, candidate.y, definition.obstacles, definition.width, definition.height)) return candidate;
      }
    }
  }
  return { ...definition.spawn };
}

function moveActor(actor: Actor, dx: number, dy: number, obstacles: Rect[], width: number, height: number): void {
  const nextX = actor.x + dx;
  const nextY = actor.y + dy;
  if (canOccupy(actor, nextX, actor.y, obstacles, width, height)) actor.x = nextX;
  if (canOccupy(actor, actor.x, nextY, obstacles, width, height)) actor.y = nextY;
}

export function movePlayer(runtime: AdventureRuntime, keys: Set<string>, delta: number, obstacles = scenes[runtime.scene].obstacles, speedMultiplier = 1): void {
  let horizontal = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
  let vertical = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
  if (horizontal !== 0 && vertical !== 0) {
    if (runtime.player.direction === "left" || runtime.player.direction === "right") vertical = 0;
    else horizontal = 0;
  }
  runtime.player.moving = horizontal !== 0 || vertical !== 0;
  if (!runtime.player.moving) return;
  if (horizontal < 0) runtime.player.direction = "left";
  else if (horizontal > 0) runtime.player.direction = "right";
  else if (vertical < 0) runtime.player.direction = "up";
  else runtime.player.direction = "down";
  runtime.player.walkTime += delta * speedMultiplier;
  const scene = scenes[runtime.scene];
  const speed = PLAYER_MOVE_SPEED * speedMultiplier;
  moveActor(runtime.player, horizontal * speed * delta, vertical * speed * delta, obstacles, scene.width, scene.height);
}

function fireAtPlayer(runtime: AdventureRuntime, source: Vec2, speed: number, spread = 0): void {
  const angle = Math.atan2(runtime.player.y - source.y, runtime.player.x - source.x) + spread;
  runtime.projectiles.push({ x: source.x, y: source.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 7, life: 3, hostile: true });
}

function moveEnemy(enemyActor: EnemyActor, runtime: AdventureRuntime, delta: number, obstacles: Rect[]): void {
  const scene = scenes[runtime.scene];
  const dx = runtime.player.x - enemyActor.x;
  const dy = runtime.player.y - enemyActor.y;
  const gap = Math.hypot(dx, dy) || 1;
  const towardX = dx / gap;
  const towardY = dy / gap;
  const side = Math.sin(enemyActor.patternTime * 1.8 + enemyActor.phase) >= 0 ? 1 : -1;

  if (enemyActor.kind === "melee") {
    const charging = Math.sin(enemyActor.patternTime * 1.45 + enemyActor.phase) > -0.35;
    const speed = charging && gap < 220 ? 74 : 42;
    const moveX = charging ? towardX : -towardY * side;
    const moveY = charging ? towardY : towardX * side;
    moveActor(enemyActor, moveX * speed * delta, moveY * speed * delta, obstacles, scene.width, scene.height);
    return;
  }

  if (enemyActor.kind === "ranged") {
    const desired = gap < 125 ? -1 : gap > 205 ? 1 : 0;
    const moveX = desired === 0 ? -towardY * side : towardX * desired;
    const moveY = desired === 0 ? towardX * side : towardY * desired;
    moveActor(enemyActor, moveX * 58 * delta, moveY * 58 * delta, obstacles, scene.width, scene.height);
    if (enemyActor.cooldown <= 0 && gap < 310) {
      fireAtPlayer(runtime, enemyActor, 130, (Math.random() - 0.5) * 0.18);
      enemyActor.cooldown = 1.35 + Math.random() * 0.45;
    }
    return;
  }

  if (enemyActor.specialPhase === "charging") {
    if (enemyActor.specialTimer > BOSS_FIRE_AIM_LOCK_DURATION) {
      enemyActor.specialAngle = Math.atan2(runtime.player.y - enemyActor.y, runtime.player.x - enemyActor.x);
    }
    enemyActor.specialTimer -= delta;
    if (enemyActor.specialTimer <= 0) {
      enemyActor.specialPhase = "breathing";
      enemyActor.specialTimer = BOSS_FIRE_DURATION;
    }
    return;
  }
  if (enemyActor.specialPhase === "breathing") {
    enemyActor.specialTimer -= delta;
    if (enemyActor.specialTimer <= 0) {
      enemyActor.specialPhase = "idle";
      enemyActor.specialTimer = 0;
      enemyActor.specialCooldown = 5.5;
    }
    return;
  }
  enemyActor.specialCooldown = Math.max(0, enemyActor.specialCooldown - delta);
  if (enemyActor.specialCooldown <= 0 && gap < 650) {
    enemyActor.specialPhase = "charging";
    enemyActor.specialTimer = BOSS_FIRE_CHARGE_DURATION;
    enemyActor.specialAngle = Math.atan2(dy, dx);
    return;
  }

  const cycle = enemyActor.patternTime % 7;
  if (cycle < 2.4) moveActor(enemyActor, towardX * 82 * delta, towardY * 82 * delta, obstacles, scene.width, scene.height);
  else if (cycle < 4.3) moveActor(enemyActor, -towardY * side * 62 * delta, towardX * side * 62 * delta, obstacles, scene.width, scene.height);
  else moveActor(enemyActor, -towardX * 45 * delta, -towardY * 45 * delta, obstacles, scene.width, scene.height);
  if (enemyActor.cooldown <= 0) {
    if (cycle > 5.4) {
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + enemyActor.patternTime * 0.15;
        runtime.projectiles.push({ x: enemyActor.x, y: enemyActor.y, vx: Math.cos(angle) * 112, vy: Math.sin(angle) * 112, radius: 8, life: 3.5, hostile: true });
      }
      enemyActor.cooldown = 1.7;
    } else {
      fireAtPlayer(runtime, enemyActor, 155);
      fireAtPlayer(runtime, enemyActor, 150, -0.16);
      fireAtPlayer(runtime, enemyActor, 150, 0.16);
      enemyActor.cooldown = 1.2;
    }
  }
}

export function updateEnemies(runtime: AdventureRuntime, delta: number, obstacles = scenes[runtime.scene].obstacles): void {
  for (const currentEnemy of runtime.enemies) {
    currentEnemy.cooldown = Math.max(0, currentEnemy.cooldown - delta);
    currentEnemy.patternTime += delta;
    moveEnemy(currentEnemy, runtime, delta, obstacles);
  }
}

export function updateProjectiles(runtime: AdventureRuntime, delta: number, obstacles = scenes[runtime.scene].obstacles): void {
  const scene = scenes[runtime.scene];
  runtime.projectiles = runtime.projectiles.filter((projectile) => {
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    projectile.life -= delta;
    if (projectile.life <= 0 || projectile.x < 0 || projectile.x > scene.width || projectile.y < 0 || projectile.y > scene.height) return false;
    return !obstacles.some((rect) => circleHitsRect(projectile.x, projectile.y, projectile.radius, rect));
  });
}

export function performAttack(runtime: AdventureRuntime, damage: number): EnemyActor[] {
  if (runtime.attackCooldown > 0) return [];
  runtime.attackTimer = 0.24;
  runtime.attackCooldown = 0.34;
  const direction = directionVector(runtime.player.direction);
  const strikeCenter = { x: runtime.player.x + direction.x * 42, y: runtime.player.y + direction.y * 42 };
  const defeated: EnemyActor[] = [];
  for (const currentEnemy of runtime.enemies) {
    if (distance(strikeCenter, currentEnemy) <= currentEnemy.radius + 35) {
      currentEnemy.hp -= damage;
      currentEnemy.x += direction.x * 15;
      currentEnemy.y += direction.y * 15;
      if (currentEnemy.hp <= 0) defeated.push(currentEnemy);
    }
  }
  runtime.enemies = runtime.enemies.filter((currentEnemy) => currentEnemy.hp > 0);
  return defeated;
}

export function damagePlayerIfHit(runtime: AdventureRuntime): boolean {
  if (runtime.elapsed < runtime.invulnerableUntil) return false;
  const touchingEnemy = runtime.enemies.some((currentEnemy) => distance(runtime.player, currentEnemy) < runtime.player.radius + currentEnemy.radius + 2);
  const projectileIndex = runtime.projectiles.findIndex((projectile) => projectile.hostile && distance(runtime.player, projectile) < runtime.player.radius + projectile.radius);
  const touchingFire = runtime.enemies.some((currentEnemy) => currentEnemy.kind === "boss" && currentEnemy.specialPhase === "breathing" && bossFireHitsPlayer(currentEnemy, runtime.player));
  if (!touchingEnemy && projectileIndex < 0 && !touchingFire) return false;
  if (projectileIndex >= 0) runtime.projectiles.splice(projectileIndex, 1);
  runtime.player.hp = Math.max(0, runtime.player.hp - 1);
  runtime.invulnerableUntil = runtime.elapsed + 0.9;
  return true;
}

function bossFireHitsPlayer(boss: EnemyActor, player: Actor): boolean {
  const start = { x: boss.x + Math.cos(boss.specialAngle) * 34, y: boss.y + Math.sin(boss.specialAngle) * 34 };
  const end = { x: start.x + Math.cos(boss.specialAngle) * BOSS_FIRE_LENGTH, y: start.y + Math.sin(boss.specialAngle) * BOSS_FIRE_LENGTH };
  return pointToSegmentDistance(player, start, end) <= player.radius + BOSS_FIRE_WIDTH / 2;
}

function pointToSegmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const position = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * position), point.y - (start.y + dy * position));
}

export function tickRuntime(runtime: AdventureRuntime, delta: number): void {
  runtime.elapsed += delta;
  runtime.attackTimer = Math.max(0, runtime.attackTimer - delta);
  runtime.attackCooldown = Math.max(0, runtime.attackCooldown - delta);
}

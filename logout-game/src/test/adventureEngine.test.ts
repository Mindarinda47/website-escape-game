import { describe, expect, it, vi } from "vitest";
import { createRuntime, damagePlayerIfHit, movePlayer, performAttack, RUN_SPEED_MULTIPLIER, updateEnemies } from "../minigame/engine";

describe("G의 전설 엔진", () => {
  it("allows only one movement axis when diagonal keys are held", () => {
    const runtime = createRuntime("world", 6, 6, { x: 400, y: 240 });
    runtime.player.direction = "down";
    movePlayer(runtime, new Set(["d", "s"]), 0.1, []);
    expect(runtime.player.x).toBe(400);
    expect(runtime.player.y).toBeGreaterThan(240);
  });

  it("applies the run multiplier without changing direction rules", () => {
    const walking = createRuntime("world", 6, 6, { x: 900, y: 600 });
    const running = createRuntime("world", 6, 6, { x: 900, y: 600 });
    movePlayer(walking, new Set(["d"]), 0.1, [], 1);
    movePlayer(running, new Set(["d"]), 0.1, [], RUN_SPEED_MULTIPLIER);
    expect(running.player.x - 900).toBeCloseTo((walking.player.x - 900) * RUN_SPEED_MULTIPLIER);
    expect(running.player.y).toBe(600);
  });

  it("defeats a normal enemy in three basic hits or two great-sword hits", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const basic = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
      basic.player.direction = "right";
      basic.enemies = [basic.enemies[0]];
      Object.assign(basic.enemies[0], { x: 142, y: 100 });
      for (let hit = 0; hit < 2; hit += 1) {
        performAttack(basic, 1);
        basic.attackCooldown = 0;
      }
      expect(basic.enemies).toHaveLength(1);
      performAttack(basic, 1);
      expect(basic.enemies).toHaveLength(0);

      const great = createRuntime("dungeon", 6, 6, { x: 100, y: 100 });
      great.player.direction = "right";
      great.enemies = [great.enemies[0]];
      Object.assign(great.enemies[0], { x: 142, y: 100 });
      performAttack(great, 2);
      great.attackCooldown = 0;
      performAttack(great, 2);
      expect(great.enemies).toHaveLength(0);
    } finally {
      random.mockRestore();
    }
  });

  it("gives ranged enemies a projectile attack pattern", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const runtime = createRuntime("dungeon", 6, 6, { x: 400, y: 240 });
      runtime.enemies = [runtime.enemies.find((enemy) => enemy.kind === "ranged")!];
      Object.assign(runtime.enemies[0], { x: 470, y: 240 });
      runtime.enemies[0].cooldown = 0;
      updateEnemies(runtime, 0.1, []);
      expect(runtime.projectiles.length).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
    }
  });

  it("charges for two seconds before the boss breathes fire for three seconds", () => {
    const runtime = createRuntime("boss", 6, 6, { x: 900, y: 230 });
    const boss = runtime.enemies[0];
    expect(boss.maxHp).toBe(30);
    boss.specialCooldown = 0;
    updateEnemies(runtime, 0.1, []);
    expect(boss.specialPhase).toBe("charging");
    expect(boss.specialTimer).toBe(2);

    updateEnemies(runtime, 2.05, []);
    expect(boss.specialPhase).toBe("breathing");
    expect(boss.specialTimer).toBe(3);
    runtime.elapsed = 1;
    expect(damagePlayerIfHit(runtime)).toBe(true);
    expect(runtime.player.hp).toBe(5);

    updateEnemies(runtime, 3.05, []);
    expect(boss.specialPhase).toBe("idle");
  });

  it("moves an exit spawn away from a blocking obstacle before play resumes", () => {
    const runtime = createRuntime("world", 6, 6, { x: 1275, y: 100 });
    const start = { x: runtime.player.x, y: runtime.player.y };
    movePlayer(runtime, new Set(["s"]), 0.1);
    expect(runtime.player.y).toBeGreaterThan(start.y);
  });
});

import { useEffect, useRef, useState } from "react";
import blacksmithSpriteSource from "../image/game/blacksmith.png";
import heroSpriteSource from "../image/game/hero-sprites.png";
import princessSpriteSource from "../image/game/princess-left.png";
import dragonBossSpriteSource from "../image/dragon-boss-front-sprite-768.png";
import rangedSkullSpriteSource from "../image/purple-flame-skull-sprite-128.png";
import meleeBatSpriteSource from "../image/vampire-bat-sprite-128.png";
import { useGameState } from "../state/GameStateContext";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  BOSS_FIRE_CHARGE_DURATION,
  BOSS_FIRE_LENGTH,
  BOSS_FIRE_WIDTH,
  clamp,
  createEnemies,
  createRuntime,
  damagePlayerIfHit,
  distance,
  movePlayer,
  performAttack,
  RUN_SPEED_MULTIPLIER,
  tickRuntime,
  updateEnemies,
  updateProjectiles,
} from "./engine";
import { sceneCopy, scenes } from "./scenes";
import type { AdventureRuntime, EnemyActor, Rect, SceneExit, Vec2 } from "./types";

const BLACKSMITH = { x: 905, y: 410 };
const VILLAGE_WELL = { x: 520, y: 500 };
const SECRET_ALTAR = { x: 1060, y: 450 };
const PRINCESS = { x: 700, y: 330 };
const G_SHIELD = { x: 630, y: 342 };

type SpriteSet = {
  hero: HTMLImageElement | null;
  blacksmith: HTMLImageElement | null;
  princess: HTMLImageElement | null;
  melee: HTMLImageElement | null;
  ranged: HTMLImageElement | null;
  boss: HTMLImageElement | null;
};

export function AdventureCanvas() {
  const { state, dispatch, notify } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<SpriteSet>({ hero: null, blacksmith: null, princess: null, melee: null, ranged: null, boss: null });
  const stateRef = useRef(state);
  const notifyRef = useRef(notify);
  const pendingSpawnRef = useRef<Vec2 | null>(null);
  const runtimeRef = useRef<AdventureRuntime>(createRuntime(state.adGame.checkpoint, state.adGame.hp, state.adGame.maxHp));
  const keysRef = useRef(new Set<string>());
  const lastTimeRef = useRef(0);
  const attackHeldRef = useRef(false);
  const interactHeldRef = useRef(false);
  const transitionLockedRef = useRef(false);
  const runningRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(sceneCopy[state.adGame.checkpoint].objective);

  useEffect(() => {
    stateRef.current = state;
    notifyRef.current = notify;
  }, [notify, state]);

  useEffect(() => {
    const load = (key: keyof SpriteSet, source: string) => {
      const image = new Image();
      image.src = source;
      image.onload = () => { spritesRef.current[key] = image; };
    };
    load("hero", heroSpriteSource);
    load("blacksmith", blacksmithSpriteSource);
    load("princess", princessSpriteSource);
    load("melee", meleeBatSpriteSource);
    load("ranged", rangedSkullSpriteSource);
    load("boss", dragonBossSpriteSource);
  }, []);

  useEffect(() => {
    const progress = stateRef.current.adGame;
    runtimeRef.current = createRuntime(state.adGame.checkpoint, progress.hp, progress.maxHp, pendingSpawnRef.current ?? scenes[state.adGame.checkpoint].spawn);
    pendingSpawnRef.current = null;
    transitionLockedRef.current = false;
    setStatus(sceneCopy[state.adGame.checkpoint].objective);
  }, [state.adGame.checkpoint]);

  useEffect(() => {
    runtimeRef.current.player.maxHp = state.adGame.maxHp;
    runtimeRef.current.player.hp = state.adGame.hp;
  }, [state.adGame.hp, state.adGame.maxHp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable=true]")) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "p") setPaused((value) => !value);
      if (key === "shift" && !event.repeat) {
        runningRef.current = !runningRef.current;
        setRunning(runningRef.current);
      }
      keysRef.current.add(key === " " ? "space" : key);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key === " " ? "space" : event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const canvasContext: CanvasRenderingContext2D = context;
    let frame = 0;

    function transition(exit: SceneExit) {
      if (transitionLockedRef.current) return;
      const progress = stateRef.current.adGame;
      if (exit.requiresLevel && progress.level < exit.requiresLevel) {
        nudgeAwayFromExit(runtimeRef.current, exit);
        setStatus(`성문은 레벨 ${exit.requiresLevel} 이상의 모험가에게만 반응한다.`);
        return;
      }
      if (exit.requiresGreatSword && !progress.greatSwordPurchased) {
        nudgeAwayFromExit(runtimeRef.current, exit);
        setStatus("성문의 문양이 마을 대장장이의 검과 같은 빛을 내고 있다.");
        return;
      }
      transitionLockedRef.current = true;
      pendingSpawnRef.current = exit.spawn;
      dispatch({ type: "SET_CHECKPOINT", checkpoint: exit.to });
    }

    function processExits(runtime: AdventureRuntime) {
      const exit = scenes[runtime.scene].exits.find((candidate) => pointInRect(runtime.player, candidate.rect, runtime.player.radius));
      if (exit) transition(exit);
    }

    function rewardEnemy(defeated: EnemyActor) {
      if (defeated.kind === "boss") {
        transitionLockedRef.current = true;
        dispatch({ type: "DEFEAT_BOSS" });
        notifyRef.current("성주 모르가스를 쓰러뜨렸습니다.");
        return;
      }
      const exp = defeated.kind === "ranged" ? 16 : 12;
      const gold = defeated.kind === "ranged" ? 12 : 8;
      dispatch({ type: "GAIN_ADVENTURE_REWARD", exp, gold });
      setStatus(`${defeated.kind === "ranged" ? "숲의 주술사" : "동굴 검사"} 격파 · EXP +${exp} · ${gold}G`);
    }

    function attack(runtime: AdventureRuntime) {
      performAttack(runtime, stateRef.current.adGame.greatSwordPurchased ? 2 : 1).forEach(rewardEnemy);
    }

    function interact(runtime: AdventureRuntime) {
      if (runtime.scene === "village") {
        if (distance(runtime.player, BLACKSMITH) < 78) {
          const progress = stateRef.current.adGame;
          if (progress.greatSwordPurchased) setStatus("대장장이: 그 검이라면 성의 갑옷도 벨 수 있을 걸세.");
          else if (progress.gold >= 45) {
            dispatch({ type: "BUY_GREAT_SWORD" });
            setStatus("굉장한 검을 손에 넣었다. 검격 한 번의 위력이 두 배가 되었다.");
          } else setStatus(`대장장이: 굉장한 검은 45G라네. 자네 주머니엔 ${progress.gold}G가 있군.`);
          return;
        }
        if (distance(runtime.player, VILLAGE_WELL) < 66) {
          runtime.player.hp = runtime.player.maxHp;
          dispatch({ type: "REST_ADVENTURE" });
          setStatus("맑은 우물물로 체력이 모두 회복되었다.");
          return;
        }
      }
      if (runtime.scene === "secret" && distance(runtime.player, SECRET_ALTAR) < 78) {
        if (!stateRef.current.collectedLetters["game-u"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-u" });
          notifyRef.current("문자 단서 U를 획득했습니다.");
        }
        setStatus("오래된 숲의 제단은 다시 조용해졌다.");
        return;
      }
      if (runtime.scene === "rescue" && distance(runtime.player, PRINCESS) < 90) {
        if (!stateRef.current.collectedLetters["game-g"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-g" });
          notifyRef.current("문자 단서 G를 획득했습니다.");
        }
        dispatch({ type: "RESCUE_PRINCESS" });
      }
    }

    function update(time: number) {
      const runtime = runtimeRef.current;
      const delta = Math.min(0.032, (time - (lastTimeRef.current || time)) / 1000);
      lastTimeRef.current = time;
      if (!paused && runtime.scene !== "clear") {
        tickRuntime(runtime, delta);
        movePlayer(runtime, keysRef.current, delta, scenes[runtime.scene].obstacles, runningRef.current ? RUN_SPEED_MULTIPLIER : 1);
        if (["dungeon", "castle-1", "castle-2", "boss"].includes(runtime.scene)) {
          updateEnemies(runtime, delta);
          updateProjectiles(runtime, delta);
        }

        const attackDown = keysRef.current.has("space");
        if (attackDown && !attackHeldRef.current) attack(runtime);
        attackHeldRef.current = attackDown;
        const interactDown = keysRef.current.has("e");
        if (interactDown && !interactHeldRef.current) interact(runtime);
        interactHeldRef.current = interactDown;

        if (damagePlayerIfHit(runtime)) {
          dispatch({ type: "SET_ADVENTURE_HP", hp: runtime.player.hp });
          setStatus(runtime.player.hp > 0 ? "공격을 받았다. 잠시 몸이 빛나는 동안에는 피해를 받지 않는다." : "눈앞이 흐려지며 마을 우물가로 돌아간다.");
          if (runtime.player.hp <= 0 && !transitionLockedRef.current) {
            transitionLockedRef.current = true;
            pendingSpawnRef.current = { x: 520, y: 570 };
            dispatch({ type: "REST_ADVENTURE" });
            dispatch({ type: "SET_CHECKPOINT", checkpoint: "village" });
          }
        }

        if (runtime.scene === "dungeon" && runtime.enemies.length === 0) {
          runtime.respawnTimer += delta;
          if (runtime.respawnTimer >= 3.2) {
            runtime.enemies = createEnemies("dungeon");
            runtime.respawnTimer = 0;
            setStatus("동굴 깊은 곳에서 새로운 마물의 기척이 들린다.");
          }
        }
        processExits(runtime);
      }
      draw(canvasContext, runtimeRef.current, paused, spritesRef.current, stateRef.current.adGame.greatSwordPurchased, stateRef.current.collectedLetters["game-u"]);
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, paused]);

  const nextLevelExp = state.adGame.level * 30;
  return (
    <section className="adventure-wrap">
      <div className="game-stage">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label="G의 전설 탑뷰 액션 RPG" />
        <div className="rpg-overlay-hud" aria-label="용사 상태">
          <span>LV {state.adGame.level}</span>
          <span className="hp-meter"><i style={{ width: `${(state.adGame.hp / state.adGame.maxHp) * 100}%` }} /></span>
          <b>{state.adGame.hp}/{state.adGame.maxHp}</b>
          <span>EXP {state.adGame.exp}/{nextLevelExp}</span>
          <span>{state.adGame.gold}G</span>
          <span className={running ? "movement-mode running" : "movement-mode"}>{running ? "RUN" : "WALK"}</span>
          <span className={state.adGame.greatSwordPurchased ? "equipped" : ""}>{state.adGame.greatSwordPurchased ? "굉장한 검" : "낡은 검"}</span>
        </div>
        <button className="game-pause-overlay" onClick={() => setPaused((value) => !value)}>{paused ? "계속" : "일시정지"}</button>
        <div className="rpg-dialogue" aria-live="polite">
          <span>{sceneCopy[state.adGame.checkpoint].title}</span>
          <p>{status}</p>
        </div>
      </div>
      <div className="game-controls"><span><kbd>WASD</kbd><kbd>방향키</kbd> 4방향 이동</span><span><kbd>Shift</kbd> 달리기 토글</span><span><kbd>Space</kbd> 검 공격</span><span><kbd>E</kbd> 대화/조사</span><span><kbd>P</kbd> 일시정지</span></div>
    </section>
  );
}

function nudgeAwayFromExit(runtime: AdventureRuntime, exit: SceneExit) {
  const centerX = exit.rect.x + exit.rect.width / 2;
  const centerY = exit.rect.y + exit.rect.height / 2;
  const dx = runtime.player.x - centerX;
  const dy = runtime.player.y - centerY;
  if (Math.abs(dx) > Math.abs(dy)) runtime.player.x += Math.sign(dx || 1) * 34;
  else runtime.player.y += Math.sign(dy || 1) * 34;
}

function pointInRect(point: Vec2, rect: Rect, margin = 0) {
  return point.x >= rect.x - margin && point.x <= rect.x + rect.width + margin && point.y >= rect.y - margin && point.y <= rect.y + rect.height + margin;
}

function cameraFor(runtime: AdventureRuntime): Vec2 {
  const scene = scenes[runtime.scene];
  return {
    x: Math.round(clamp(runtime.player.x - CANVAS_WIDTH / 2, 0, Math.max(0, scene.width - CANVAS_WIDTH))),
    y: Math.round(clamp(runtime.player.y - CANVAS_HEIGHT / 2, 0, Math.max(0, scene.height - CANVAS_HEIGHT))),
  };
}

function draw(context: CanvasRenderingContext2D, runtime: AdventureRuntime, paused: boolean, sprites: SpriteSet, hasGreatSword: boolean, hasU: boolean) {
  const camera = cameraFor(runtime);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.save();
  context.translate(-camera.x, -camera.y);
  drawGround(context, runtime.scene);
  drawMapObjects(context, runtime, sprites, hasU);
  drawBossSkill(context, runtime);
  runtime.projectiles.forEach((projectile) => {
    context.fillStyle = "#b884ff";
    context.beginPath(); context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(230,210,255,.7)"; context.stroke();
  });
  runtime.enemies.forEach((currentEnemy) => drawEnemy(context, currentEnemy, sprites));
  drawAttackEffect(context, runtime, hasGreatSword);
  drawHero(context, runtime, sprites.hero, hasGreatSword);
  context.restore();
  const gradient = context.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 190, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 470);
  gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(1, "rgba(3,5,12,.42)");
  context.fillStyle = gradient; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (paused) {
    context.fillStyle = "rgba(5,8,16,.72)"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "white"; context.font = "bold 30px monospace"; context.textAlign = "center"; context.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); context.textAlign = "start";
  }
}

function tileNoise(x: number, y: number, salt: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 31.7) * 43758.5453;
  return value - Math.floor(value);
}

function drawGround(context: CanvasRenderingContext2D, sceneId: AdventureRuntime["scene"]) {
  const scene = scenes[sceneId];
  const ground = scene.ground;
  const colors: Record<typeof ground, [string, string, string]> = {
    village: ["#91b975", "#7fa969", "#b9a56c"], grass: ["#579454", "#4b854e", "#7e9d5b"],
    dungeon: ["#343e47", "#2a333c", "#56616a"], castle: ["#463a4b", "#392f40", "#6b566d"],
    secret: ["#285540", "#204735", "#4f7d52"], rescue: ["#504661", "#40394f", "#766d83"],
  };
  const [base, alternate, accent] = colors[ground];
  context.fillStyle = base; context.fillRect(0, 0, scene.width, scene.height);
  const tile = 32;
  for (let y = 0; y < scene.height; y += tile) {
    for (let x = 0; x < scene.width; x += tile) {
      context.fillStyle = (x / tile + y / tile) % 2 === 0 ? alternate : base;
      context.globalAlpha = 0.24; context.fillRect(x, y, tile, tile); context.globalAlpha = 1;
      const noise = tileNoise(x, y, sceneId.length);
      if (noise > 0.58) {
        context.fillStyle = accent;
        if (["village", "grass", "secret"].includes(ground)) {
          context.fillRect(x + 8 + Math.floor(noise * 9), y + 10, 2, 7);
          context.fillRect(x + 12 + Math.floor(noise * 6), y + 13, 2, 4);
        } else {
          context.globalAlpha = 0.34;
          context.fillRect(x + 4, y + 5, 12, 2); context.fillRect(x + 14, y + 5, 2, 8);
          context.globalAlpha = 1;
        }
      }
    }
  }
  if (ground === "village") {
    drawPixelPath(context, [{ x: 0, y: 430 }, { x: 1200, y: 430 }], 96, "#c6ad72");
    drawPixelPath(context, [{ x: 520, y: 0 }, { x: 520, y: 760 }], 82, "#c6ad72");
  }
  if (ground === "grass") {
    drawPixelPath(context, [{ x: 0, y: 600 }, { x: 850, y: 600 }, { x: 500, y: 55 }], 64, "#b4a269");
    drawPixelPath(context, [{ x: 850, y: 600 }, { x: 1575, y: 55 }], 64, "#b4a269");
    drawPixelPath(context, [{ x: 850, y: 600 }, { x: 1780, y: 1040 }], 54, "#8e925b");
  }
  if (ground === "castle") {
    context.fillStyle = "rgba(116,61,79,.38)"; context.fillRect(scene.width / 2 - 72, 0, 144, scene.height);
    context.fillStyle = "rgba(214,174,108,.18)";
    for (let y = 24; y < scene.height; y += 96) context.fillRect(scene.width / 2 - 68, y, 136, 8);
  }
}

function drawPixelPath(context: CanvasRenderingContext2D, points: Vec2[], width: number, color: string) {
  context.strokeStyle = color; context.lineWidth = width; context.lineCap = "square"; context.lineJoin = "bevel";
  context.beginPath(); context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y)); context.stroke();
  context.strokeStyle = "rgba(255,237,180,.18)"; context.lineWidth = 5; context.setLineDash([12, 18]); context.stroke(); context.setLineDash([]);
}

function drawMapObjects(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprites: SpriteSet, hasU: boolean) {
  const scene = scenes[runtime.scene];
  scene.obstacles.forEach((obstacle, index) => {
    if (scene.ground === "village" && index < 2) drawBuilding(context, obstacle, index);
    else if (scene.ground === "village") drawFenceOrStone(context, obstacle, index === 2 ? "#86775d" : "#6b5338");
    else if (scene.ground === "grass" || scene.ground === "secret") drawTreeCluster(context, obstacle);
    else drawDungeonWall(context, obstacle, scene.ground === "castle" ? "#66546b" : "#56616b");
  });
  scene.exits.filter((exit) => !exit.hidden).forEach((exit) => drawExit(context, exit));

  if (runtime.scene === "village") {
    drawSpriteNpc(context, sprites.blacksmith, BLACKSMITH, 82);
    drawWell(context, VILLAGE_WELL);
    drawForge(context, { x: 980, y: 410 });
  }
  if (runtime.scene === "world") {
    drawCaveEntrance(context, { x: 485, y: 70 });
    drawCastleGate(context, { x: 1575, y: 70 });
  }
  if (runtime.scene === "secret" && !hasU) {
    context.fillStyle = "rgba(182,246,207,.16)"; context.beginPath(); context.arc(SECRET_ALTAR.x, SECRET_ALTAR.y, 66, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d7ffd9"; context.font = "bold 54px Georgia"; context.textAlign = "center"; context.fillText("U", SECRET_ALTAR.x, SECRET_ALTAR.y + 18); context.textAlign = "start";
  }
  if (runtime.scene === "boss") {
    context.fillStyle = "#1c1721"; context.fillRect(555, 82, 190, 72);
    context.fillStyle = "#9b779c"; context.font = "bold 17px monospace"; context.textAlign = "center"; context.fillText("MORGAS", 650, 124); context.textAlign = "start";
  }
  if (runtime.scene === "rescue") {
    context.fillStyle = "rgba(255,225,158,.13)"; context.beginPath(); context.arc(PRINCESS.x, PRINCESS.y, 95, 0, Math.PI * 2); context.fill();
    drawShield(context, G_SHIELD.x, G_SHIELD.y, 0.72);
    drawSpriteNpc(context, sprites.princess, PRINCESS, 88);
  }
}

function drawHero(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprite: HTMLImageElement | null, hasGreatSword: boolean) {
  if (runtime.elapsed < runtime.invulnerableUntil && Math.floor(runtime.elapsed * 14) % 2 === 0) return;
  const player = runtime.player;
  const walkPhase = Math.floor(player.walkTime * 10) % 4;
  const stepping = player.moving && (walkPhase === 1 || walkPhase === 3);
  const bob = stepping && runtime.attackTimer <= 0 ? -2 : 0;
  if (player.moving) drawFootstepDust(context, runtime, walkPhase);
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(player.x, player.y + 18, stepping ? 17 : 19, stepping ? 6 : 7, 0, 0, Math.PI * 2); context.fill();
  if (sprite?.complete) {
    const row = { down: 0, left: 1, right: 2, up: 3 }[player.direction];
    const walkColumns = [0, 1, 0, 2];
    const column = runtime.attackTimer > 0 ? 3 : player.moving ? walkColumns[walkPhase] : 0;
    const drawSize = runtime.attackTimer > 0 ? 90 : 78;
    context.drawImage(sprite, column * 256, row * 256, 256, 256, player.x - drawSize / 2, player.y - drawSize * 0.75 + bob, drawSize, drawSize);
  } else {
    context.fillStyle = "#233c61"; context.beginPath(); context.arc(player.x, player.y, 17, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d56b35"; context.fillRect(player.x - 17, player.y + 2, 34, 7);
  }
  if (hasGreatSword) {
    context.fillStyle = "#ffd574"; context.beginPath(); context.arc(player.x + 17, player.y - 19, 4, 0, Math.PI * 2); context.fill();
  }
}

function drawFootstepDust(context: CanvasRenderingContext2D, runtime: AdventureRuntime, walkPhase: number) {
  if (walkPhase !== 1 && walkPhase !== 3) return;
  const player = runtime.player;
  const backward = { down: { x: 0, y: -1 }, left: { x: 1, y: 0 }, right: { x: -1, y: 0 }, up: { x: 0, y: 1 } }[player.direction];
  const side = walkPhase === 1 ? -1 : 1;
  context.fillStyle = "rgba(222,205,157,.42)";
  context.fillRect(Math.round(player.x + backward.x * 13 + backward.y * side * 5), Math.round(player.y + 18 + backward.y * 7 + backward.x * side * 5), 4, 3);
  context.fillStyle = "rgba(222,205,157,.24)";
  context.fillRect(Math.round(player.x + backward.x * 19 - backward.y * side * 4), Math.round(player.y + 20 + backward.y * 10 - backward.x * side * 4), 3, 2);
}

function drawAttackEffect(context: CanvasRenderingContext2D, runtime: AdventureRuntime, hasGreatSword: boolean) {
  if (runtime.attackTimer <= 0) return;
  const player = runtime.player;
  const angle = { down: Math.PI / 2, left: Math.PI, right: 0, up: -Math.PI / 2 }[player.direction];
  const progress = 1 - runtime.attackTimer / 0.24;
  const opacity = Math.max(0, 1 - progress * 0.82);
  const range = 77;

  context.save();
  context.fillStyle = hasGreatSword ? `rgba(255,205,94,${0.2 * opacity})` : `rgba(188,226,255,${0.17 * opacity})`;
  context.beginPath();
  context.moveTo(player.x, player.y);
  context.arc(player.x, player.y, range, angle - 0.7, angle + 0.7);
  context.closePath();
  context.fill();

  const sweepStart = angle - 0.72 + progress * 0.42;
  const sweepEnd = angle - 0.2 + progress * 0.88;
  context.strokeStyle = hasGreatSword ? `rgba(255,225,132,${0.9 * opacity})` : `rgba(220,242,255,${0.82 * opacity})`;
  context.lineWidth = hasGreatSword ? 10 : 8;
  context.lineCap = "round";
  context.beginPath();
  context.arc(player.x, player.y, 63, sweepStart, sweepEnd);
  context.stroke();
  context.strokeStyle = hasGreatSword ? `rgba(255,164,55,${0.65 * opacity})` : `rgba(105,186,240,${0.58 * opacity})`;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(player.x, player.y, range, angle - 0.7, angle + 0.7);
  context.stroke();
  context.restore();
}

function drawBossSkill(context: CanvasRenderingContext2D, runtime: AdventureRuntime) {
  const boss = runtime.enemies.find((enemy) => enemy.kind === "boss");
  if (!boss || boss.specialPhase === "idle") return;
  const direction = { x: Math.cos(boss.specialAngle), y: Math.sin(boss.specialAngle) };
  const start = { x: boss.x + direction.x * 34, y: boss.y + direction.y * 34 };
  const end = { x: start.x + direction.x * BOSS_FIRE_LENGTH, y: start.y + direction.y * BOSS_FIRE_LENGTH };
  context.save();
  context.lineCap = "round";

  if (boss.specialPhase === "charging") {
    const progress = 1 - boss.specialTimer / BOSS_FIRE_CHARGE_DURATION;
    context.strokeStyle = `rgba(255,107,45,${0.08 + progress * 0.18})`;
    context.lineWidth = BOSS_FIRE_WIDTH;
    context.setLineDash([18, 13]);
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.setLineDash([]);
    for (let index = 0; index < 7; index += 1) {
      const orbit = boss.patternTime * 5 + index * (Math.PI * 2 / 7);
      const radius = 28 - progress * 16 + (index % 2) * 5;
      context.fillStyle = index % 2 ? `rgba(255,193,64,${0.5 + progress * 0.45})` : `rgba(255,76,32,${0.45 + progress * 0.4})`;
      context.beginPath();
      context.arc(start.x + Math.cos(orbit) * radius, start.y + Math.sin(orbit) * radius, 3 + progress * 3, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = `rgba(255,220,112,${0.55 + progress * 0.4})`;
    context.lineWidth = 4 + progress * 5;
    context.beginPath(); context.arc(start.x, start.y, 23 - progress * 10, 0, Math.PI * 2); context.stroke();
  } else {
    const pulse = (Math.sin(boss.patternTime * 18) + 1) / 2;
    context.strokeStyle = "rgba(128,26,18,.78)";
    context.lineWidth = BOSS_FIRE_WIDTH + 12 + pulse * 4;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(244,67,28,.92)";
    context.lineWidth = BOSS_FIRE_WIDTH;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(255,155,38,.96)";
    context.lineWidth = 36 + pulse * 5;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.strokeStyle = "rgba(255,238,136,.96)";
    context.lineWidth = 14 + pulse * 4;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
    context.fillStyle = "rgba(255,207,70,.9)";
    context.beginPath(); context.arc(start.x, start.y, 24 + pulse * 6, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawEnemy(context: CanvasRenderingContext2D, currentEnemy: EnemyActor, sprites: SpriteSet) {
  const bob = Math.round(Math.sin(currentEnemy.patternTime * (currentEnemy.kind === "boss" ? 2.2 : 5.5) + currentEnemy.phase) * (currentEnemy.kind === "boss" ? 2 : 3));
  const shadowWidth = currentEnemy.kind === "boss" ? 64 : 20;
  context.fillStyle = "rgba(0,0,0,.3)"; context.beginPath(); context.ellipse(currentEnemy.x, currentEnemy.y + currentEnemy.radius, shadowWidth, currentEnemy.kind === "boss" ? 13 : 7, 0, 0, Math.PI * 2); context.fill();

  const sprite = sprites[currentEnemy.kind];
  if (sprite?.complete) {
    if (currentEnemy.kind === "boss") {
      const breathe = 1 + Math.sin(currentEnemy.patternTime * 2.2) * 0.015;
      const width = 190 * breathe;
      const height = 190 / breathe;
      context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - height * 0.68 + bob, width, height);
    } else {
      const wingPulse = currentEnemy.kind === "melee" ? 1 + Math.sin(currentEnemy.patternTime * 8 + currentEnemy.phase) * 0.06 : 1;
      const width = 64 * wingPulse;
      context.drawImage(sprite, currentEnemy.x - width / 2, currentEnemy.y - 44 + bob, width, 64);
      if (currentEnemy.kind === "ranged") {
        context.strokeStyle = "rgba(203,185,255,.56)"; context.lineWidth = 2;
        context.beginPath(); context.arc(currentEnemy.x, currentEnemy.y + bob, 25 + Math.sin(currentEnemy.patternTime * 4) * 3, 0, Math.PI * 2); context.stroke();
      }
    }
  }

  const barWidth = currentEnemy.kind === "boss" ? 140 : 48;
  const barY = currentEnemy.y - (currentEnemy.kind === "boss" ? 142 : 55);
  context.fillStyle = "rgba(20,14,22,.86)"; context.fillRect(currentEnemy.x - barWidth / 2 - 2, barY - 2, barWidth + 4, 8);
  context.fillStyle = currentEnemy.kind === "boss" ? "#e65379" : "#e7bd67";
  context.fillRect(currentEnemy.x - barWidth / 2, barY, barWidth * (currentEnemy.hp / currentEnemy.maxHp), 4);
}

function drawBuilding(context: CanvasRenderingContext2D, rect: Rect, variant: number) {
  context.fillStyle = variant ? "#cfbd96" : "#e2d0a8"; context.fillRect(rect.x, rect.y + 44, rect.width, rect.height - 44);
  context.fillStyle = variant ? "#514a69" : "#8b5149";
  for (let y = rect.y + 8; y < rect.y + 58; y += 12) context.fillRect(rect.x - 12 + ((y / 12) % 2) * 8, y, rect.width + 24, 13);
  context.fillStyle = "#5f402f"; context.fillRect(rect.x + rect.width / 2 - 19, rect.y + rect.height - 54, 38, 54);
  context.fillStyle = "#7fb1bd"; context.fillRect(rect.x + 32, rect.y + 84, 38, 28); context.fillRect(rect.x + rect.width - 70, rect.y + 84, 38, 28);
  context.strokeStyle = "#eee0ba"; context.lineWidth = 4; context.strokeRect(rect.x + 32, rect.y + 84, 38, 28); context.strokeRect(rect.x + rect.width - 70, rect.y + 84, 38, 28);
}

function drawTreeCluster(context: CanvasRenderingContext2D, rect: Rect) {
  const points = [[0.18, 0.32], [0.48, 0.2], [0.76, 0.35], [0.34, 0.65], [0.7, 0.72]];
  points.forEach(([px, py], index) => {
    const x = rect.x + rect.width * px; const y = rect.y + rect.height * py;
    context.fillStyle = "#5b402b"; context.fillRect(x - 7, y + 9, 14, 25);
    context.fillStyle = index % 2 ? "#286541" : "#397849";
    context.fillRect(x - 18, y - 16, 36, 34); context.fillRect(x - 12, y - 24, 24, 10);
    context.fillStyle = "rgba(155,204,108,.33)"; context.fillRect(x - 12, y - 12, 15, 5);
  });
}

function drawFenceOrStone(context: CanvasRenderingContext2D, rect: Rect, color: string) {
  context.fillStyle = color; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(255,255,255,.15)"; context.lineWidth = 3; context.strokeRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
}

function drawDungeonWall(context: CanvasRenderingContext2D, rect: Rect, color: string) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.fillRect(rect.x + 8, rect.y + 10, rect.width, rect.height);
  context.fillStyle = color; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(225,225,230,.15)"; context.lineWidth = 3; context.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
  context.strokeStyle = "rgba(20,20,28,.24)"; context.lineWidth = 2;
  for (let x = rect.x + 28; x < rect.x + rect.width; x += 48) { context.beginPath(); context.moveTo(x, rect.y + 4); context.lineTo(x - 8, rect.y + Math.min(30, rect.height - 4)); context.stroke(); }
}

function drawExit(context: CanvasRenderingContext2D, exit: SceneExit) {
  context.fillStyle = "rgba(255,223,145,.17)"; context.fillRect(exit.rect.x, exit.rect.y, exit.rect.width, exit.rect.height);
  context.strokeStyle = "rgba(255,236,166,.42)"; context.lineWidth = 3; context.strokeRect(exit.rect.x + 2, exit.rect.y + 2, exit.rect.width - 4, exit.rect.height - 4);
  context.fillStyle = "#fff0ba"; context.font = "bold 12px sans-serif"; context.textAlign = "center";
  context.fillText(exit.label, exit.rect.x + exit.rect.width / 2, exit.rect.y + exit.rect.height / 2 + 4); context.textAlign = "start";
}

function drawSpriteNpc(context: CanvasRenderingContext2D, sprite: HTMLImageElement | null, point: Vec2, size: number) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(point.x, point.y + 18, 20, 7, 0, 0, Math.PI * 2); context.fill();
  if (sprite?.complete) context.drawImage(sprite, point.x - size / 2, point.y - size * 0.76, size, size);
}

function drawWell(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#776a5b"; context.fillRect(point.x - 32, point.y - 8, 64, 30);
  context.fillStyle = "#69a2b7"; context.beginPath(); context.ellipse(point.x, point.y - 7, 28, 13, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#ded0a7"; context.lineWidth = 6; context.stroke();
  context.fillStyle = "#67462e"; context.fillRect(point.x - 34, point.y - 50, 7, 48); context.fillRect(point.x + 27, point.y - 50, 7, 48); context.fillRect(point.x - 38, point.y - 54, 76, 8);
}

function drawForge(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#494044"; context.fillRect(point.x - 30, point.y - 20, 60, 44);
  context.fillStyle = "#e06638"; context.fillRect(point.x - 16, point.y - 8, 32, 22);
  context.fillStyle = "#ffd266"; context.fillRect(point.x - 8, point.y - 2, 16, 12);
}

function drawCaveEntrance(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#4c5359"; context.fillRect(point.x - 82, point.y - 18, 164, 76);
  context.fillStyle = "#20262c"; context.beginPath(); context.arc(point.x, point.y + 55, 52, Math.PI, 0); context.fill(); context.fillRect(point.x - 52, point.y + 50, 104, 30);
  context.fillStyle = "#d8c184"; context.font = "bold 13px monospace"; context.textAlign = "center"; context.fillText("메아리 동굴", point.x, point.y + 16); context.textAlign = "start";
}

function drawCastleGate(context: CanvasRenderingContext2D, point: Vec2) {
  context.fillStyle = "#58475d"; context.fillRect(point.x - 92, point.y - 36, 184, 116);
  context.fillStyle = "#2c2330"; context.fillRect(point.x - 42, point.y + 8, 84, 72);
  context.fillStyle = "#8d7390"; for (let x = point.x - 86; x < point.x + 86; x += 30) context.fillRect(x, point.y - 48, 22, 18);
  context.fillStyle = "#ead5a0"; context.font = "bold 13px monospace"; context.textAlign = "center"; context.fillText("검은 성", point.x, point.y - 5); context.textAlign = "start";
}

function drawShield(context: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  context.save(); context.translate(x, y); context.scale(scale, scale);
  context.fillStyle = "#e6bd56"; context.beginPath(); context.moveTo(0, -42); context.lineTo(35, -25); context.lineTo(27, 25); context.lineTo(0, 48); context.lineTo(-27, 25); context.lineTo(-35, -25); context.closePath(); context.fill();
  context.strokeStyle = "#fff0a5"; context.lineWidth = 5; context.stroke();
  context.fillStyle = "#694d22"; context.font = "bold 38px Georgia"; context.textAlign = "center"; context.fillText("G", 0, 13); context.restore(); context.textAlign = "start";
}

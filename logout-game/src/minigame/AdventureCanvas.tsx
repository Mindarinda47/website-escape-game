import { useEffect, useRef, useState, type MouseEvent } from "react";
import heroSpriteSource from "../image/game/hero-sprites.png";
import { useGameState } from "../state/GameStateContext";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createEnemies,
  createRuntime,
  damagePlayerIfHit,
  distance,
  movePlayer,
  performAttack,
  tickRuntime,
  updateEnemies,
  updateProjectiles,
} from "./engine";
import { sceneCopy, scenes } from "./scenes";
import type { AdventureRuntime, EnemyActor, Rect, SceneExit, Vec2 } from "./types";

const BLACKSMITH = { x: 555, y: 245 };
const VILLAGE_WELL = { x: 346, y: 315 };
const SECRET_ALTAR = { x: 650, y: 240 };
const PRINCESS = { x: 430, y: 235 };
const G_SHIELD = { x: 535, y: 235 };

export function AdventureCanvas() {
  const { state, dispatch, notify } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef(state);
  const notifyRef = useRef(notify);
  const pendingSpawnRef = useRef<Vec2 | null>(null);
  const runtimeRef = useRef<AdventureRuntime>(createRuntime(state.adGame.checkpoint, state.adGame.hp, state.adGame.maxHp));
  const keysRef = useRef(new Set<string>());
  const lastTimeRef = useRef(0);
  const attackHeldRef = useRef(false);
  const interactHeldRef = useRef(false);
  const transitionLockedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(sceneCopy[state.adGame.checkpoint].objective);

  useEffect(() => {
    stateRef.current = state;
    notifyRef.current = notify;
  }, [notify, state]);

  useEffect(() => {
    const image = new Image();
    image.src = heroSpriteSource;
    image.onload = () => { spriteRef.current = image; };
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
        runtimeRef.current.player.y = Math.max(92, runtimeRef.current.player.y + 28);
        setStatus(`성문은 레벨 ${exit.requiresLevel} 이상의 용사에게만 반응합니다.`);
        return;
      }
      if (exit.requiresGreatSword && !progress.greatSwordPurchased) {
        runtimeRef.current.player.y = Math.max(92, runtimeRef.current.player.y + 28);
        setStatus("성문에 새겨진 홈이 마을의 굉장한 검과 같은 모양입니다.");
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

    function rewardEnemy(runtime: AdventureRuntime, defeated: EnemyActor) {
      if (defeated.kind === "boss") {
        transitionLockedRef.current = true;
        dispatch({ type: "DEFEAT_BOSS" });
        notifyRef.current("성주 모르가스를 물리쳤습니다.");
        return;
      }
      const exp = defeated.kind === "ranged" ? 16 : 12;
      const gold = defeated.kind === "ranged" ? 12 : 8;
      dispatch({ type: "GAIN_ADVENTURE_REWARD", exp, gold });
      setStatus(`${defeated.kind === "ranged" ? "숲의 주술사" : "동굴 검수"} 격파 · EXP +${exp} · ${gold}G`);
    }

    function attack(runtime: AdventureRuntime) {
      const defeated = performAttack(runtime, stateRef.current.adGame.greatSwordPurchased ? 2 : 1);
      defeated.forEach((currentEnemy) => rewardEnemy(runtime, currentEnemy));
    }

    function interact(runtime: AdventureRuntime) {
      if (runtime.scene === "village") {
        if (distance(runtime.player, BLACKSMITH) < 70) {
          const progress = stateRef.current.adGame;
          if (progress.greatSwordPurchased) setStatus("대장장이: 그 검이라면 검은 성의 갑옷도 벨 수 있을 걸세.");
          else if (progress.gold >= 45) {
            dispatch({ type: "BUY_GREAT_SWORD" });
            setStatus("굉장한 검을 구입했습니다. 일반 마물을 두 번의 공격으로 쓰러뜨릴 수 있습니다.");
          } else setStatus(`대장장이: 굉장한 검은 45G라네. 지금은 ${progress.gold}G를 가지고 있군.`);
          return;
        }
        if (distance(runtime.player, VILLAGE_WELL) < 60) {
          runtime.player.hp = runtime.player.maxHp;
          dispatch({ type: "REST_ADVENTURE" });
          setStatus("맑은 우물물로 체력을 모두 회복했습니다.");
          return;
        }
      }
      if (runtime.scene === "secret" && distance(runtime.player, SECRET_ALTAR) < 72) {
        if (!stateRef.current.collectedLetters["game-u"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-u" });
          notifyRef.current("문자 단서 U를 획득했습니다.");
        }
        setStatus("오래된 숲의 제단은 다시 조용해졌습니다.");
      }
    }

    function update(time: number) {
      const runtime = runtimeRef.current;
      const delta = Math.min(0.032, (time - (lastTimeRef.current || time)) / 1000);
      lastTimeRef.current = time;
      if (!paused && runtime.scene !== "clear") {
        tickRuntime(runtime, delta);
        movePlayer(runtime, keysRef.current, delta);
        if (runtime.scene === "dungeon" || runtime.scene === "boss") {
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
          setStatus(runtime.player.hp > 0 ? "공격을 받았습니다. 잠시 몸이 빛나는 동안은 피해를 받지 않습니다." : "힘이 다해 마을의 우물가로 돌아갑니다.");
          if (runtime.player.hp <= 0 && !transitionLockedRef.current) {
            transitionLockedRef.current = true;
            pendingSpawnRef.current = { x: 346, y: 350 };
            dispatch({ type: "REST_ADVENTURE" });
            dispatch({ type: "SET_CHECKPOINT", checkpoint: "village" });
          }
        }

        if (runtime.scene === "dungeon" && runtime.enemies.length === 0) {
          runtime.respawnTimer += delta;
          if (runtime.respawnTimer >= 2.8) {
            runtime.enemies = createEnemies("dungeon");
            runtime.respawnTimer = 0;
            setStatus("동굴 깊은 곳에서 새로운 마물 무리가 나타났습니다.");
          }
        }
        processExits(runtime);
      }
      draw(canvasContext, runtimeRef.current, paused, spriteRef.current, stateRef.current.adGame.greatSwordPurchased, stateRef.current.collectedLetters["game-u"]);
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, paused]);

  function clickCanvas(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || state.adGame.checkpoint !== "rescue") return;
    const bounds = canvas.getBoundingClientRect();
    const point = { x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH, y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT };
    if (distance(point, G_SHIELD) > 58) return;
    if (!state.collectedLetters["game-g"]) {
      dispatch({ type: "COLLECT_LETTER", clue: "game-g" });
      notify("문자 단서 G를 획득했습니다.");
    }
    dispatch({ type: "RESCUE_PRINCESS" });
  }

  const nextLevelExp = state.adGame.level * 30;
  return (
    <section className="adventure-wrap">
      <div className="game-status rpg-game-status">
        <div className="quest-status"><span>{sceneCopy[state.adGame.checkpoint].title}</span><strong>{status}</strong></div>
        <div className="rpg-stats" aria-label="용사 상태">
          <span>LV {state.adGame.level}</span>
          <span className="hp-meter"><i style={{ width: `${(state.adGame.hp / state.adGame.maxHp) * 100}%` }} /></span><b>{state.adGame.hp}/{state.adGame.maxHp}</b>
          <span>EXP {state.adGame.exp}/{nextLevelExp}</span><span>{state.adGame.gold}G</span>
          <span className={state.adGame.greatSwordPurchased ? "equipped" : ""}>{state.adGame.greatSwordPurchased ? "굉장한 검" : "낡은 검"}</span>
        </div>
        <button className="button ghost" onClick={() => setPaused((value) => !value)}>{paused ? "계속하기" : "일시정지 (P)"}</button>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onClick={clickCanvas} className={state.adGame.checkpoint === "rescue" ? "reward-cursor" : ""} aria-label="G의 전설 탑뷰 액션 RPG" />
      <div className="game-controls"><span><kbd>WASD</kbd><kbd>방향키</kbd> 4방향 이동</span><span><kbd>Space</kbd> 검 공격</span><span><kbd>E</kbd> 대화·조사</span><span><kbd>P</kbd> 일시정지</span></div>
    </section>
  );
}

function pointInRect(point: Vec2, rect: Rect, margin = 0) {
  return point.x >= rect.x - margin && point.x <= rect.x + rect.width + margin && point.y >= rect.y - margin && point.y <= rect.y + rect.height + margin;
}

function draw(context: CanvasRenderingContext2D, runtime: AdventureRuntime, paused: boolean, sprite: HTMLImageElement | null, hasGreatSword: boolean, hasU: boolean) {
  drawGround(context, runtime.scene);
  drawMapObjects(context, runtime, hasU);
  runtime.projectiles.forEach((projectile) => {
    context.fillStyle = "#b884ff";
    context.beginPath(); context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "rgba(230,210,255,.7)"; context.stroke();
  });
  runtime.enemies.forEach((currentEnemy) => drawEnemy(context, currentEnemy));
  drawHero(context, runtime, sprite, hasGreatSword);
  if (paused) {
    context.fillStyle = "rgba(5,8,16,.72)"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "white"; context.font = "bold 30px monospace"; context.textAlign = "center"; context.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); context.textAlign = "start";
  }
}

function drawGround(context: CanvasRenderingContext2D, scene: AdventureRuntime["scene"]) {
  const ground = scenes[scene].ground;
  const colors: Record<typeof ground, [string, string]> = {
    village: ["#a7c985", "#d8c68a"], grass: ["#78ae68", "#4f8c59"], dungeon: ["#3c4650", "#252d36"],
    castle: ["#4a394f", "#251f2c"], secret: ["#315c49", "#183c36"], rescue: ["#594d69", "#28263e"],
  };
  const [base, alternate] = colors[ground];
  context.fillStyle = base; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const tile = 32;
  for (let y = 48; y < CANVAS_HEIGHT; y += tile) for (let x = 0; x < CANVAS_WIDTH; x += tile) {
    if ((x / tile + y / tile) % 2 === 0) { context.fillStyle = alternate; context.globalAlpha = 0.11; context.fillRect(x, y, tile, tile); context.globalAlpha = 1; }
  }
  if (ground === "village") {
    context.fillStyle = "#c9b27d"; context.fillRect(0, 230, CANVAS_WIDTH, 75); context.fillRect(330, 48, 75, CANVAS_HEIGHT - 48);
  }
  if (ground === "grass") {
    context.strokeStyle = "rgba(225,210,145,.42)"; context.lineWidth = 46; context.lineCap = "round";
    context.beginPath(); context.moveTo(0, 245); context.lineTo(370, 245); context.lineTo(190, 62); context.moveTo(370, 245); context.lineTo(665, 62); context.moveTo(370, 245); context.lineTo(744, 420); context.stroke();
  }
}

function drawMapObjects(context: CanvasRenderingContext2D, runtime: AdventureRuntime, hasU: boolean) {
  const scene = scenes[runtime.scene];
  scene.obstacles.forEach((obstacle, index) => {
    if (scene.ground === "village" && index < 2) drawBuilding(context, obstacle);
    else if (scene.ground === "village") drawStone(context, obstacle, index === 2 ? "#9f9274" : "#755d3e");
    else if (scene.ground === "grass" || scene.ground === "secret") drawTreeCluster(context, obstacle);
    else drawStone(context, obstacle, scene.ground === "castle" ? "#67536b" : "#59636d");
  });
  scene.exits.filter((exit) => !exit.hidden).forEach((exit) => drawExit(context, exit));

  if (runtime.scene === "village") {
    drawNpc(context, BLACKSMITH.x, BLACKSMITH.y, "#9a5c36", "검");
    context.fillStyle = "#6ea5ba"; context.beginPath(); context.arc(VILLAGE_WELL.x, VILLAGE_WELL.y, 26, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#e3d3a6"; context.lineWidth = 7; context.stroke();
  }
  if (runtime.scene === "world") {
    drawLandmark(context, 190, 72, "동굴", "#4a4650");
    drawLandmark(context, 665, 72, "검은 성", "#59405d");
  }
  if (runtime.scene === "secret" && !hasU) {
    context.fillStyle = "rgba(182,246,207,.16)"; context.beginPath(); context.arc(SECRET_ALTAR.x, SECRET_ALTAR.y, 58, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d7ffd9"; context.font = "bold 54px Georgia"; context.textAlign = "center"; context.fillText("U", SECRET_ALTAR.x, SECRET_ALTAR.y + 18); context.textAlign = "start";
  }
  if (runtime.scene === "boss") {
    context.fillStyle = "#1c1721"; context.fillRect(310, 55, 148, 54);
    context.fillStyle = "#9b779c"; context.font = "bold 15px monospace"; context.textAlign = "center"; context.fillText("MORGAS", 384, 86); context.textAlign = "start";
  }
  if (runtime.scene === "rescue") {
    context.fillStyle = "rgba(255,225,158,.15)"; context.beginPath(); context.arc(PRINCESS.x, PRINCESS.y, 78, 0, Math.PI * 2); context.fill();
    drawNpc(context, PRINCESS.x, PRINCESS.y, "#f0bd74", "♕");
    drawShield(context, G_SHIELD.x, G_SHIELD.y);
    context.fillStyle = "#fff2bf"; context.font = "bold 16px sans-serif"; context.textAlign = "center"; context.fillText("G의 방패를 클릭하세요", G_SHIELD.x, G_SHIELD.y + 78); context.textAlign = "start";
  }
}

function drawHero(context: CanvasRenderingContext2D, runtime: AdventureRuntime, sprite: HTMLImageElement | null, hasGreatSword: boolean) {
  if (runtime.elapsed < runtime.invulnerableUntil && Math.floor(runtime.elapsed * 14) % 2 === 0) return;
  const player = runtime.player;
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(player.x, player.y + 18, 19, 7, 0, 0, Math.PI * 2); context.fill();
  if (sprite?.complete) {
    const row = { down: 0, left: 1, right: 2, up: 3 }[player.direction];
    const column = runtime.attackTimer > 0 ? 3 : player.moving ? (Math.floor(player.walkTime * 8) % 2 === 0 ? 1 : 2) : 0;
    const cellWidth = sprite.naturalWidth / 4;
    const cellHeight = sprite.naturalHeight / 4;
    const drawSize = runtime.attackTimer > 0 ? 86 : 72;
    context.drawImage(sprite, column * cellWidth, row * cellHeight, cellWidth, cellHeight, player.x - drawSize / 2, player.y - drawSize * 0.7, drawSize, drawSize);
  } else {
    context.fillStyle = "#233c61"; context.beginPath(); context.arc(player.x, player.y, 17, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d56b35"; context.fillRect(player.x - 17, player.y + 2, 34, 7);
  }
  if (hasGreatSword) {
    context.fillStyle = "#ffd574"; context.beginPath(); context.arc(player.x + 17, player.y - 19, 4, 0, Math.PI * 2); context.fill();
  }
}

function drawEnemy(context: CanvasRenderingContext2D, currentEnemy: EnemyActor) {
  context.fillStyle = "rgba(0,0,0,.28)"; context.beginPath(); context.ellipse(currentEnemy.x, currentEnemy.y + currentEnemy.radius, currentEnemy.radius, 7, 0, 0, Math.PI * 2); context.fill();
  if (currentEnemy.kind === "melee") {
    context.fillStyle = "#934f45"; context.fillRect(currentEnemy.x - 15, currentEnemy.y - 14, 30, 30);
    context.fillStyle = "#ffe19b"; context.fillRect(currentEnemy.x - 10, currentEnemy.y - 7, 5, 5); context.fillRect(currentEnemy.x + 5, currentEnemy.y - 7, 5, 5);
  } else if (currentEnemy.kind === "ranged") {
    context.fillStyle = "#665099"; context.beginPath(); context.arc(currentEnemy.x, currentEnemy.y, 17, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#cbb9ff"; context.beginPath(); context.arc(currentEnemy.x, currentEnemy.y, 23 + Math.sin(currentEnemy.patternTime * 4) * 3, 0, Math.PI * 2); context.stroke();
  } else {
    context.fillStyle = "#5e263f"; context.beginPath(); context.arc(currentEnemy.x, currentEnemy.y, 30, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#d7a0c0"; context.font = "bold 28px serif"; context.textAlign = "center"; context.fillText("♜", currentEnemy.x, currentEnemy.y + 9); context.textAlign = "start";
  }
  context.fillStyle = "rgba(20,14,22,.8)"; context.fillRect(currentEnemy.x - 21, currentEnemy.y - currentEnemy.radius - 15, 42, 5);
  context.fillStyle = currentEnemy.kind === "boss" ? "#e9718d" : "#e7bd67"; context.fillRect(currentEnemy.x - 20, currentEnemy.y - currentEnemy.radius - 14, 40 * (currentEnemy.hp / currentEnemy.maxHp), 3);
}

function drawBuilding(context: CanvasRenderingContext2D, rect: Rect) {
  context.fillStyle = "#e8d8b1"; context.fillRect(rect.x, rect.y + 24, rect.width, rect.height - 24);
  context.fillStyle = "#94584e"; context.beginPath(); context.moveTo(rect.x - 10, rect.y + 34); context.lineTo(rect.x + rect.width / 2, rect.y - 12); context.lineTo(rect.x + rect.width + 10, rect.y + 34); context.closePath(); context.fill();
  context.fillStyle = "#6f4a35"; context.fillRect(rect.x + rect.width / 2 - 15, rect.y + rect.height - 40, 30, 40);
}

function drawTreeCluster(context: CanvasRenderingContext2D, rect: Rect) {
  const points = [[0.2, 0.28], [0.55, 0.2], [0.78, 0.42], [0.38, 0.64], [0.72, 0.75]];
  points.forEach(([px, py], index) => {
    const x = rect.x + rect.width * px; const y = rect.y + rect.height * py;
    context.fillStyle = "#60472e"; context.fillRect(x - 5, y + 7, 10, 19);
    context.fillStyle = index % 2 ? "#2f7047" : "#3f8050"; context.beginPath(); context.arc(x, y, 20, 0, Math.PI * 2); context.fill();
  });
}

function drawStone(context: CanvasRenderingContext2D, rect: Rect, color: string) {
  context.fillStyle = color; context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "rgba(255,255,255,.13)"; context.lineWidth = 3; context.strokeRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
}

function drawExit(context: CanvasRenderingContext2D, exit: SceneExit) {
  context.fillStyle = "rgba(255,236,166,.2)"; context.fillRect(exit.rect.x, exit.rect.y, exit.rect.width, exit.rect.height);
  context.fillStyle = "#fff0ba"; context.font = "bold 12px sans-serif"; context.textAlign = "center";
  context.fillText(exit.label, exit.rect.x + exit.rect.width / 2, exit.rect.y + exit.rect.height / 2 + 4); context.textAlign = "start";
}

function drawNpc(context: CanvasRenderingContext2D, x: number, y: number, color: string, glyph: string) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(x, y + 18, 18, 7, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = color; context.beginPath(); context.arc(x, y, 19, 0, Math.PI * 2); context.fill();
  context.fillStyle = "white"; context.font = "bold 18px serif"; context.textAlign = "center"; context.fillText(glyph, x, y + 6); context.textAlign = "start";
}

function drawLandmark(context: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  context.fillStyle = color; context.fillRect(x - 35, y - 18, 70, 38);
  context.fillStyle = "#f5e6b0"; context.font = "bold 12px sans-serif"; context.textAlign = "center"; context.fillText(label, x, y + 5); context.textAlign = "start";
}

function drawShield(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save(); context.translate(x, y);
  context.fillStyle = "#e6bd56"; context.beginPath(); context.moveTo(0, -42); context.lineTo(35, -25); context.lineTo(27, 25); context.lineTo(0, 48); context.lineTo(-27, 25); context.lineTo(-35, -25); context.closePath(); context.fill();
  context.strokeStyle = "#fff0a5"; context.lineWidth = 5; context.stroke();
  context.fillStyle = "#694d22"; context.font = "bold 38px Georgia"; context.textAlign = "center"; context.fillText("G", 0, 13); context.restore(); context.textAlign = "start";
}

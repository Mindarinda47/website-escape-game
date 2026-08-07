import { useEffect, useRef, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import { CANVAS_HEIGHT, CANVAS_WIDTH, createRuntime, distance, moveEnemies, movePlayer } from "./engine";
import { sceneCopy } from "./scenes";
import type { AdventureRuntime } from "./types";

export function AdventureCanvas() {
  const { state, dispatch, notify } = useGameState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<AdventureRuntime>(createRuntime(state.adGame.checkpoint));
  const keysRef = useRef(new Set<string>());
  const lastTimeRef = useRef(0);
  const attackHeldRef = useRef(false);
  const interactHeldRef = useRef(false);
  const transitionLockedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(sceneCopy[state.adGame.checkpoint].objective);

  useEffect(() => {
    runtimeRef.current = createRuntime(state.adGame.checkpoint);
    transitionLockedRef.current = false;
    setStatus(sceneCopy[state.adGame.checkpoint].objective);
  }, [state.adGame.checkpoint]);

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

    function transition(checkpoint: "light-room" | "boss" | "rescue") {
      if (transitionLockedRef.current) return;
      transitionLockedRef.current = true;
      dispatch({ type: "SET_CHECKPOINT", checkpoint });
    }

    function attack(runtime: AdventureRuntime) {
      runtime.attackFlash = 0.16;
      if (runtime.scene === "start") {
        runtime.enemies = runtime.enemies.filter((enemy) => {
          if (distance(runtime.player, enemy) < 68) enemy.hp -= 1;
          return enemy.hp > 0;
        });
        if (!runtime.enemies.length) setStatus("그림자가 걷혔습니다. 오른쪽 문 앞에서 E를 누르세요.");
      }
      if (runtime.scene === "light-room" && distance(runtime.player, { x: 330, y: 180 }) < 82) {
        runtime.switchHits = Math.min(2, runtime.switchHits + 1);
        setStatus(runtime.switchHits >= 2 ? "빛의 활이 나타났습니다. 활 앞에서 E를 누르세요." : "스위치가 희미하게 빛납니다. 한 번 더 공격하세요.");
      }
      if (runtime.scene === "boss" && runtime.boss && distance(runtime.player, runtime.boss) < 92) {
        runtime.boss.hp -= 1;
        setStatus(runtime.boss.hp > 0 ? `수문장이 흔들립니다. ${runtime.boss.hp}번 더 공격하세요.` : "수문장이 물러났습니다. 구출 방으로 이동합니다.");
        if (runtime.boss.hp <= 0) {
          dispatch({ type: "DEFEAT_BOSS" });
          transitionLockedRef.current = true;
          notify("그림자 수문장을 물리쳤습니다.");
        }
      }
    }

    function interact(runtime: AdventureRuntime) {
      if (runtime.scene === "start" && !runtime.enemies.length && runtime.player.x > 545) transition("light-room");
      if (runtime.scene === "light-room" && runtime.switchHits >= 2 && distance(runtime.player, { x: 510, y: 180 }) < 72) {
        if (!state.collectedLetters["game-u"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-u" });
          notify("빛의 활에서 문자 단서 U를 발견했습니다.");
        }
        transition("boss");
      }
      if (runtime.scene === "rescue" && distance(runtime.player, { x: 500, y: 180 }) < 76 && !transitionLockedRef.current) {
        transitionLockedRef.current = true;
        if (!state.collectedLetters["game-g"]) {
          dispatch({ type: "COLLECT_LETTER", clue: "game-g" });
          notify("황금 방패에서 문자 단서 G를 발견했습니다.");
        }
        dispatch({ type: "RESCUE_PRINCESS" });
      }
    }

    function update(time: number) {
      const runtime = runtimeRef.current;
      const delta = Math.min(0.032, (time - (lastTimeRef.current || time)) / 1000);
      lastTimeRef.current = time;
      if (!paused && runtime.scene !== "clear") {
        movePlayer(runtime, keysRef.current, delta);
        if (runtime.scene === "start") moveEnemies(runtime, delta);
        const attackDown = keysRef.current.has("space");
        if (attackDown && !attackHeldRef.current) attack(runtime);
        attackHeldRef.current = attackDown;
        const interactDown = keysRef.current.has("e");
        if (interactDown && !interactHeldRef.current) interact(runtime);
        interactHeldRef.current = interactDown;
        runtime.attackFlash = Math.max(0, runtime.attackFlash - delta);
        const threats = runtime.scene === "start" ? runtime.enemies : runtime.boss ? [runtime.boss] : [];
        if (time > runtime.invulnerableUntil && threats.some((actor) => distance(runtime.player, actor) < runtime.player.radius + actor.radius + 2)) {
          runtimeRef.current = createRuntime(runtime.scene);
          runtimeRef.current.invulnerableUntil = time + 800;
          setStatus("그림자에 닿았습니다. 현재 방의 입구에서 다시 시작합니다.");
        }
      }
      draw(canvasContext, runtimeRef.current, paused);
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, notify, paused, state.collectedLetters]);

  return (
    <section className="adventure-wrap">
      <div className="game-status"><div><span>{sceneCopy[state.adGame.checkpoint].title}</span><strong>{status}</strong></div><button className="button ghost" onClick={() => setPaused((value) => !value)}>{paused ? "계속하기" : "일시정지 (P)"}</button></div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label="빛의 모험 탑뷰 액션 게임" />
      <div className="game-controls"><span><kbd>WASD</kbd><kbd>방향키</kbd> 이동</span><span><kbd>Space</kbd> 공격</span><span><kbd>E</kbd> 상호작용</span><span><kbd>P</kbd> 일시정지</span></div>
    </section>
  );
}

function draw(context: CanvasRenderingContext2D, runtime: AdventureRuntime, paused: boolean) {
  const sceneColors: Record<AdventureRuntime["scene"], [string, string]> = {
    start: ["#111827", "#273449"],
    "light-room": ["#16243a", "#46647f"],
    boss: ["#20172b", "#513a56"],
    rescue: ["#24314a", "#c19558"],
    clear: ["#f5d998", "#fff4ce"],
  };
  const [top, bottom] = sceneColors[runtime.scene];
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.strokeStyle = "rgba(255,255,255,.13)";
  context.lineWidth = 2;
  for (let x = 32; x < CANVAS_WIDTH; x += 64) for (let y = 56; y < CANVAS_HEIGHT; y += 64) context.strokeRect(x, y, 64, 64);

  if (runtime.scene === "start") {
    context.fillStyle = runtime.enemies.length ? "#5a6175" : "#f3c86b";
    context.fillRect(592, 112, 18, 136);
    runtime.enemies.forEach((enemy) => drawActor(context, enemy.x, enemy.y, "#2a2039", "◆"));
  }
  if (runtime.scene === "light-room") {
    context.strokeStyle = runtime.switchHits >= 2 ? "#ffe399" : "#7192aa";
    context.lineWidth = 8;
    context.beginPath(); context.arc(330, 180, 31, 0, Math.PI * 2); context.stroke();
    context.fillStyle = "#e8f4ff"; context.font = "18px sans-serif"; context.fillText(`${runtime.switchHits}/2`, 316, 187);
    if (runtime.switchHits >= 2) {
      context.strokeStyle = "#fff1a8"; context.lineWidth = 9;
      context.beginPath(); context.arc(510, 180, 34, 0, Math.PI); context.stroke();
      context.fillStyle = "#fff7c6"; context.font = "bold 27px sans-serif"; context.fillText("U", 498, 196);
    }
  }
  if (runtime.scene === "boss" && runtime.boss) {
    drawActor(context, runtime.boss.x, runtime.boss.y, "#7b334d", "♜");
    context.fillStyle = "#120d17"; context.fillRect(406, 72, 128, 10);
    context.fillStyle = "#e26c79"; context.fillRect(408, 74, 124 * (runtime.boss.hp / 3), 6);
  }
  if (runtime.scene === "rescue") {
    context.fillStyle = "rgba(255,231,166,.2)"; context.beginPath(); context.arc(500, 180, 84, 0, Math.PI * 2); context.fill();
    drawActor(context, 500, 180, "#f1c47c", "♙");
    context.fillStyle = "#d5a73d"; context.font = "bold 28px serif"; context.fillText("G", 545, 130);
  }
  if (runtime.scene !== "clear") {
    drawActor(context, runtime.player.x, runtime.player.y, "#f5e6b2", "♢");
    if (runtime.attackFlash > 0) {
      context.strokeStyle = "#fff6b8"; context.lineWidth = 6; context.beginPath(); context.arc(runtime.player.x, runtime.player.y, 43, -0.7, 0.7); context.stroke();
    }
  }
  if (paused) {
    context.fillStyle = "rgba(5,8,16,.7)"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "white"; context.font = "bold 28px sans-serif"; context.textAlign = "center"; context.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); context.textAlign = "start";
  }
}

function drawActor(context: CanvasRenderingContext2D, x: number, y: number, color: string, glyph: string) {
  context.fillStyle = "rgba(0,0,0,.25)"; context.beginPath(); context.ellipse(x, y + 16, 18, 7, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = color; context.beginPath(); context.arc(x, y, 17, 0, Math.PI * 2); context.fill();
  context.fillStyle = "white"; context.font = "bold 19px serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(glyph, x, y + 1); context.textAlign = "start"; context.textBaseline = "alphabetic";
}

import { useEffect, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import gangrimFcImage from "../image/강림FC.png";
import dorimFcImage from "../image/도림FC.png";

type Prediction = "home" | "draw" | "away";
type Team = "home" | "away";
type SimPlayer = { id: string; team: Team; x: number; y: number; baseX: number; baseY: number; goalkeeper?: boolean };
type MatchSimulation = {
  elapsed: number;
  homeScore: number;
  awayScore: number;
  ball: { x: number; y: number; vx: number; vy: number };
  players: SimPlayer[];
  commentary: string;
};

const MATCH_SECONDS = 24;
const TICK_SECONDS = 0.1;

const formation: SimPlayer[] = [
  { id: "h-gk", team: "home", x: 7, y: 50, baseX: 7, baseY: 50, goalkeeper: true },
  { id: "h-1", team: "home", x: 25, y: 27, baseX: 25, baseY: 27 },
  { id: "h-2", team: "home", x: 25, y: 73, baseX: 25, baseY: 73 },
  { id: "h-3", team: "home", x: 42, y: 38, baseX: 42, baseY: 38 },
  { id: "h-4", team: "home", x: 42, y: 62, baseX: 42, baseY: 62 },
  { id: "a-gk", team: "away", x: 93, y: 50, baseX: 93, baseY: 50, goalkeeper: true },
  { id: "a-1", team: "away", x: 75, y: 27, baseX: 75, baseY: 27 },
  { id: "a-2", team: "away", x: 75, y: 73, baseX: 75, baseY: 73 },
  { id: "a-3", team: "away", x: 58, y: 38, baseX: 58, baseY: 38 },
  { id: "a-4", team: "away", x: 58, y: 62, baseX: 58, baseY: 62 },
];

function createSimulation(): MatchSimulation {
  return {
    elapsed: 0,
    homeScore: 0,
    awayScore: 0,
    ball: { x: 50, y: 50, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.5 },
    players: formation.map((player) => ({ ...player })),
    commentary: "양 팀 선수들이 각자의 위치를 잡고 있습니다.",
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(player: SimPlayer, targetX: number, targetY: number, speed: number): SimPlayer {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const step = Math.min(speed, length);
  return { ...player, x: player.x + (dx / length) * step, y: player.y + (dy / length) * step };
}

function nearestPlayer(players: SimPlayer[], team: Team, ball: MatchSimulation["ball"]) {
  return players.filter((player) => player.team === team).reduce((nearest, player) => distance(player, ball) < distance(nearest, ball) ? player : nearest);
}

function stepSimulation(current: MatchSimulation): MatchSimulation {
  if (current.elapsed >= MATCH_SECONDS) return current;

  const homeChaser = nearestPlayer(current.players, "home", current.ball).id;
  const awayChaser = nearestPlayer(current.players, "away", current.ball).id;
  const players = current.players.map((player) => {
    if (player.goalkeeper) {
      const targetY = Math.max(34, Math.min(66, current.ball.y));
      return moveToward(player, player.baseX, targetY, 0.62);
    }
    if (player.id === homeChaser || player.id === awayChaser) return moveToward(player, current.ball.x, current.ball.y, 1.02);
    const fieldShift = (current.ball.x - 50) * 0.13;
    const targetX = Math.max(10, Math.min(90, player.baseX + fieldShift));
    const targetY = player.baseY + (current.ball.y - 50) * 0.08;
    return moveToward(player, targetX, targetY, 0.42);
  });

  const ball = {
    x: current.ball.x + current.ball.vx,
    y: current.ball.y + current.ball.vy,
    vx: current.ball.vx * 0.982,
    vy: current.ball.vy * 0.982,
  };
  let homeScore = current.homeScore;
  let awayScore = current.awayScore;
  let commentary = current.commentary;

  const closest = players.reduce((nearest, player) => distance(player, ball) < distance(nearest, ball) ? player : nearest);
  if (distance(closest, ball) < 2.7 && Math.hypot(ball.vx, ball.vy) < 3.4) {
    const direction = closest.team === "home" ? 1 : -1;
    const inShootingRange = closest.team === "home" ? closest.x > 63 : closest.x < 37;
    const targetY = inShootingRange ? 50 + (Math.random() - 0.5) * 25 : closest.y + (Math.random() - 0.5) * 35;
    const targetX = closest.team === "home" ? 101 : -1;
    const dx = targetX - closest.x;
    const dy = targetY - closest.y;
    const length = Math.hypot(dx, dy) || 1;
    const power = inShootingRange ? 3.25 : 2.35;
    ball.vx = (dx / length) * power;
    ball.vy = (dy / length) * power;
    ball.x += direction * 1.2;
    commentary = inShootingRange
      ? `${closest.team === "home" ? "강림FC" : "도림FC"}가 골문을 향해 슈팅합니다.`
      : `${closest.team === "home" ? "강림FC" : "도림FC"}가 전방으로 공을 연결합니다.`;
  }

  if (ball.y <= 2 || ball.y >= 98) {
    ball.y = Math.max(2, Math.min(98, ball.y));
    ball.vy *= -0.72;
  }

  if (ball.x >= 99) {
    if (ball.y >= 35 && ball.y <= 65) {
      homeScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: -0.65, vy: (Math.random() - 0.5) * 0.45 });
      commentary = "강림FC의 골입니다. 도림FC가 중앙에서 경기를 재개합니다.";
    } else {
      ball.x = 98;
      ball.vx = -Math.abs(ball.vx) * 0.65;
      commentary = "강림FC의 슈팅이 골문을 벗어났습니다.";
    }
  } else if (ball.x <= 1) {
    if (ball.y >= 35 && ball.y <= 65) {
      awayScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: 0.65, vy: (Math.random() - 0.5) * 0.45 });
      commentary = "도림FC의 골입니다. 강림FC가 중앙에서 경기를 재개합니다.";
    } else {
      ball.x = 2;
      ball.vx = Math.abs(ball.vx) * 0.65;
      commentary = "도림FC의 슈팅이 골문을 벗어났습니다.";
    }
  }

  return { elapsed: Math.min(MATCH_SECONDS, current.elapsed + TICK_SECONDS), homeScore, awayScore, ball, players, commentary };
}

function outcomeOf(homeScore: number, awayScore: number): Prediction {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function SportsPage() {
  const { state, dispatch, notify } = useGameState();
  const [running, setRunning] = useState(false);
  const [simulation, setSimulation] = useState<MatchSimulation>(createSimulation);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSimulation(stepSimulation), TICK_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || simulation.elapsed < MATCH_SECONDS) return;
    finishMatch();
  });

  function startMatch(prediction: Prediction) {
    dispatch({ type: "START_MATCH", prediction });
    setSimulation(createSimulation());
    setRunning(true);
  }

  function finishMatch(result: MatchSimulation = simulation) {
    if (!running) return;
    const outcome = outcomeOf(result.homeScore, result.awayScore);
    const predictionWasCorrect = state.sports.prediction === outcome;
    setRunning(false);
    setSimulation(result);
    dispatch({ type: "FINISH_MATCH", outcome, homeScore: result.homeScore, awayScore: result.awayScore });
    notify(predictionWasCorrect ? "예측 성공 보상으로 50,000P를 획득했습니다." : "예측이 빗나가 보상은 지급되지 않았습니다.");
  }

  function skipMatch() {
    let finalSimulation = simulation;
    while (finalSimulation.elapsed < MATCH_SECONDS) finalSimulation = stepSimulation(finalSimulation);
    finishMatch(finalSimulation);
  }

  const matchDone = state.sports.simulationCompleted;
  const homeScore = matchDone ? state.sports.homeScore : simulation.homeScore;
  const awayScore = matchDone ? state.sports.awayScore : simulation.awayScore;
  const minute = Math.min(90, Math.round((simulation.elapsed / MATCH_SECONDS) * 90));

  return (
    <main className="sports-page page-inner">
      <header className="site-header sports-header"><div><span className="site-kicker">경기 전의 모든 순간</span><h1>하프타임 스포츠</h1></div><div className="live-chip">12라운드 · 오늘</div></header>
      <section className="match-hero">
        <div className="team home-team"><span className="team-crest"><img src={gangrimFcImage} alt="" /></span><h2>강림FC</h2><small>HOME</small></div>
        <div className="score-board"><span>{running ? `${minute}'` : matchDone ? "종료" : "예정"}</span><strong>{running || matchDone ? `${homeScore} : ${awayScore}` : "- : -"}</strong><small>오늘 · 해질녘 구장</small></div>
        <div className="team away-team"><span className="team-crest"><img src={dorimFcImage} alt="" /></span><h2>도림FC</h2><small>AWAY</small></div>
        <div className="pitch simulation-pitch" aria-hidden="true">
          <i className="center-circle" />
          <i className="goal goal-home" /><i className="goal goal-away" />
          {simulation.players.map((player) => <i key={player.id} className={`sim-player ${player.team} ${player.goalkeeper ? "goalkeeper" : ""}`} style={{ left: `${player.x}%`, top: `${player.y}%` }} />)}
          <i className="ball" style={{ left: `${simulation.ball.x}%`, top: `${simulation.ball.y}%` }} />
        </div>
      </section>

      {!running && !matchDone && <section className="prediction-panel"><span className="eyebrow">승부 예측</span><h2>선수들의 움직임에 따라 매 경기 결과가 달라집니다.</h2><div className="prediction-buttons"><button onClick={() => startMatch("home")}><b>홈 승</b><span>강림FC</span></button><button onClick={() => startMatch("draw")}><b>무승부</b><span>같은 점수</span></button><button onClick={() => startMatch("away")}><b>원정 승</b><span>도림FC</span></button></div></section>}

      {running && <section className="commentary" aria-live="polite"><div className="match-progress"><i style={{ width: `${(simulation.elapsed / MATCH_SECONDS) * 100}%` }} /></div><h2>{simulation.commentary}</h2>{state.sports.attempts > 0 && <button className="button ghost" onClick={skipMatch}>경기 건너뛰기</button>}</section>}

      {matchDone && <section className={`match-result ${state.sports.predictionWasCorrect ? "correct" : "failed"}`}><div className="result-badge">{state.sports.predictionWasCorrect ? "예측 성공" : "예측 실패"}</div><div><h2>최종 스코어 {state.sports.homeScore} : {state.sports.awayScore}</h2>{state.sports.predictionWasCorrect ? <p className="reward-note">P 예측 보상 50,000P가 지급되었습니다.</p> : <p>이번 경기의 보상은 지급되지 않았습니다.</p>}</div>{!state.sports.predictionWasCorrect && <button className="button ghost" onClick={() => dispatch({ type: "RETRY_MATCH" })}>다시 예측하기</button>}</section>}
    </main>
  );
}

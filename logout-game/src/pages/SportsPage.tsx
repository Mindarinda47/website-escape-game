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
  kickCooldown: number;
  restartDelay: number;
};

const MATCH_SECONDS = 36;
const TICK_SECONDS = 0.1;
const CONTROL_DISTANCE = 1.45;
const CONTEST_DISTANCE = 1.75;

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

function createKickoffFormation(kickoffTeam: Team): SimPlayer[] {
  const kickoffPlayerId = kickoffTeam === "home" ? "h-3" : "a-3";
  return formation.map((player) => {
    if (player.id === kickoffPlayerId) return { ...player, x: kickoffTeam === "home" ? 49 : 51, y: 50 };
    const xVariation = player.goalkeeper ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 3;
    const yVariation = (Math.random() - 0.5) * 5;
    return {
      ...player,
      x: Math.max(4, Math.min(96, player.baseX + xVariation)),
      y: Math.max(8, Math.min(92, player.baseY + yVariation)),
    };
  });
}

export function createSimulation(): MatchSimulation {
  return {
    elapsed: 0,
    homeScore: 0,
    awayScore: 0,
    ball: { x: 50, y: 50, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.5 },
    players: formation.map((player) => ({ ...player })),
    commentary: "양 팀 선수들이 각자의 위치를 잡고 있습니다.",
    kickCooldown: 0,
    restartDelay: 0,
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

function nearestPlayer(players: SimPlayer[], team: Team, ball: MatchSimulation["ball"], outfieldOnly = false) {
  return players
    .filter((player) => player.team === team && (!outfieldOnly || !player.goalkeeper))
    .reduce((nearest, player) => distance(player, ball) < distance(nearest, ball) ? player : nearest);
}

function nearestOpponentDistance(players: SimPlayer[], player: SimPlayer) {
  const opponent: Team = player.team === "home" ? "away" : "home";
  return Math.min(...players.filter((candidate) => candidate.team === opponent).map((candidate) => distance(candidate, player)));
}

export function stepSimulation(current: MatchSimulation): MatchSimulation {
  if (current.elapsed >= MATCH_SECONDS) return current;
  if (current.restartDelay > 0) {
    return {
      ...current,
      elapsed: Math.min(MATCH_SECONDS, current.elapsed + TICK_SECONDS),
      kickCooldown: 0,
      restartDelay: Math.max(0, current.restartDelay - TICK_SECONDS),
    };
  }

  const homeChaser = nearestPlayer(current.players, "home", current.ball, true).id;
  const awayChaser = nearestPlayer(current.players, "away", current.ball, true).id;
  const chaseX = Math.max(3, Math.min(97, current.ball.x + current.ball.vx * 1.4));
  const chaseY = Math.max(3, Math.min(97, current.ball.y + current.ball.vy * 1.4));
  let players = current.players.map((player) => {
    if (player.goalkeeper) {
      const targetY = Math.max(34, Math.min(66, current.ball.y));
      return moveToward(player, player.baseX, targetY, 0.62);
    }
    if (player.id === homeChaser || player.id === awayChaser) return moveToward(player, chaseX, chaseY, 1.02);
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
  let kickCooldown = Math.max(0, current.kickCooldown - TICK_SECONDS);

  const closestHome = nearestPlayer(players, "home", ball);
  const closestAway = nearestPlayer(players, "away", ball);
  const homeDistance = distance(closestHome, ball);
  const awayDistance = distance(closestAway, ball);
  const contested = homeDistance < CONTEST_DISTANCE && awayDistance < CONTEST_DISTANCE;

  if (contested && kickCooldown <= 0) {
    const angle = Math.random() * Math.PI * 2;
    const power = 2.6 + Math.random() * 1.6;
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;
    ball.x += Math.cos(angle) * 1.8;
    ball.y += Math.sin(angle) * 1.8;
    kickCooldown = 0.45;
    commentary = "치열한 경합 끝에 공이 예상하지 못한 방향으로 튕겨 나갑니다.";
  } else {
    const closest = homeDistance < awayDistance ? closestHome : closestAway;
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (distance(closest, ball) < CONTROL_DISTANCE && ballSpeed < 2.8 && kickCooldown <= 0) {
    const direction = closest.team === "home" ? 1 : -1;
    const inShootingRange = closest.team === "home" ? closest.x > 63 : closest.x < 37;
      const teammates = players.filter((player) => player.team === closest.team && player.id !== closest.id && !player.goalkeeper);
      const passTarget = teammates.reduce((best, candidate) => {
        const score = direction * (candidate.x - closest.x) * 0.75 + nearestOpponentDistance(players, candidate) * 0.45 - distance(closest, candidate) * 0.08;
        const bestScore = direction * (best.x - closest.x) * 0.75 + nearestOpponentDistance(players, best) * 0.45 - distance(closest, best) * 0.08;
        return score > bestScore ? candidate : best;
      });
      const targetX = inShootingRange ? (closest.team === "home" ? 101 : -1) : passTarget.x + direction * 1.5;
      const targetY = inShootingRange ? 50 + (Math.random() - 0.5) * 22 : passTarget.y + (Math.random() - 0.5) * 5;
    const dx = targetX - closest.x;
    const dy = targetY - closest.y;
    const length = Math.hypot(dx, dy) || 1;
      const power = inShootingRange ? 3.55 : Math.min(3.1, 2.05 + distance(closest, passTarget) * 0.035);
    ball.vx = (dx / length) * power;
    ball.vy = (dy / length) * power;
      ball.x = closest.x + (dx / length) * 1.7;
      ball.y = closest.y + (dy / length) * 1.7;
      kickCooldown = 0.35;
    commentary = inShootingRange
      ? `${closest.team === "home" ? "강림FC" : "도림FC"}가 골문을 향해 슈팅합니다.`
        : `${closest.team === "home" ? "강림FC" : "도림FC"}가 빈 공간의 동료에게 패스합니다.`;
    }
  }

  if (ball.y <= 2 || ball.y >= 98) {
    ball.y = Math.max(2, Math.min(98, ball.y));
    ball.vy *= -0.72;
  }

  if (ball.x >= 99) {
    if (ball.y >= 35 && ball.y <= 65) {
      homeScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: 0, vy: 0 });
      players = createKickoffFormation("away");
      kickCooldown = 0;
      commentary = "강림FC의 골입니다. 도림FC가 중앙에서 경기를 재개합니다.";
    } else {
      ball.x = 98;
      ball.vx = -Math.abs(ball.vx) * 0.65;
      commentary = "강림FC의 슈팅이 골문을 벗어났습니다.";
    }
  } else if (ball.x <= 1) {
    if (ball.y >= 35 && ball.y <= 65) {
      awayScore += 1;
      Object.assign(ball, { x: 50, y: 50, vx: 0, vy: 0 });
      players = createKickoffFormation("home");
      kickCooldown = 0;
      commentary = "도림FC의 골입니다. 강림FC가 중앙에서 경기를 재개합니다.";
    } else {
      ball.x = 2;
      ball.vx = Math.abs(ball.vx) * 0.65;
      commentary = "도림FC의 슈팅이 골문을 벗어났습니다.";
    }
  }

  const restartDelay = homeScore !== current.homeScore || awayScore !== current.awayScore ? 0.8 : 0;
  return { elapsed: Math.min(MATCH_SECONDS, current.elapsed + TICK_SECONDS), homeScore, awayScore, ball, players, commentary, kickCooldown, restartDelay };
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
      <section className="match-hero sports-match-hero">
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

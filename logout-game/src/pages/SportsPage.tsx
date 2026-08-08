import { useEffect, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import gangrimFcImage from "../image/강림FC.png";
import dorimFcImage from "../image/도림FC.png";
type Prediction = "home" | "draw" | "away";

const MATCH_SECONDS = 12;

export function SportsPage() {
  const { state, dispatch, notify } = useGameState();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.min(MATCH_SECONDS, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || seconds < MATCH_SECONDS) return;
    finishMatch();
  });

  function startMatch(prediction: Prediction) {
    dispatch({ type: "START_MATCH", prediction });
    setSeconds(0);
    setRunning(true);
  }

  function finishMatch() {
    if (!running) return;
    const predictionWasCorrect = state.sports.prediction === "home";
    setRunning(false);
    setSeconds(MATCH_SECONDS);
    dispatch({ type: "FINISH_MATCH" });
    notify(predictionWasCorrect ? "예측 성공 보상으로 50,000P를 획득했습니다." : "예측이 빗나가 보상은 지급되지 않았습니다.");
  }

  const matchDone = state.sports.simulationCompleted;
  const score = seconds < 4 ? "0 : 0" : seconds < 8 ? "1 : 0" : seconds < 11 ? "1 : 1" : "2 : 1";
  const minute = Math.min(90, Math.round((seconds / MATCH_SECONDS) * 90));

  return (
    <main className="sports-page page-inner">
      <header className="site-header sports-header"><div><span className="site-kicker">경기 전의 모든 순간</span><h1>하프타임 스포츠</h1></div><div className="live-chip">12라운드 · 오늘</div></header>
      <section className="match-hero">
        <div className="team home-team"><span className="team-crest"><img src={gangrimFcImage} alt="" /></span><h2>강림FC</h2><small>HOME</small></div>
        <div className="score-board"><span>{running ? `${minute}'` : matchDone ? "종료" : "예정"}</span><strong>{matchDone ? "2 : 1" : running ? score : "- : -"}</strong><small>오늘 · 해질녘 구장</small></div>
        <div className="team away-team"><span className="team-crest"><img src={dorimFcImage} alt="" /></span><h2>도림FC</h2><small>AWAY</small></div>
        <div className="pitch" aria-hidden="true"><i className="center-circle" /><i className="ball" style={{ left: `${20 + (seconds / MATCH_SECONDS) * 60}%` }} /><i className="player p1" /><i className="player p2" /><i className="player p3" /><i className="player p4" /></div>
      </section>

      {!running && !matchDone && <section className="prediction-panel"><span className="eyebrow">승부 예측</span><h2>결과를 알 수 없어도 선택할 수 있습니다.</h2><div className="prediction-buttons"><button onClick={() => startMatch("home")}><b>홈 승</b><span>강림FC</span></button><button onClick={() => startMatch("draw")}><b>무승부</b><span>같은 점수</span></button><button onClick={() => startMatch("away")}><b>원정 승</b><span>도림FC</span></button></div></section>}

      {running && <section className="commentary" aria-live="polite"><div className="match-progress"><i style={{ width: `${(seconds / MATCH_SECONDS) * 100}%` }} /></div><h2>{seconds < 4 ? "양 팀이 천천히 간격을 살핍니다." : seconds < 8 ? "강림FC가 먼저 움직였습니다." : seconds < 11 ? "도림FC가 다시 균형을 맞춥니다." : "마지막 선택이 골문으로 향합니다."}</h2>{state.sports.attempts > 0 && <button className="button ghost" onClick={finishMatch}>경기 건너뛰기</button>}</section>}

      {matchDone && <section className={`match-result ${state.sports.predictionWasCorrect ? "correct" : "failed"}`}><div className="result-badge">{state.sports.predictionWasCorrect ? "예측 성공" : "예측 실패"}</div><div><h2>{state.sports.predictionWasCorrect ? "예측이 맞았습니다." : "예측은 빗나갔습니다."}</h2>{state.sports.predictionWasCorrect ? <p className="reward-note">P 예측 보상 50,000P가 지급되었습니다.</p> : <p>이번 경기의 보상은 지급되지 않았습니다.</p>}</div>{!state.sports.predictionWasCorrect && <button className="button ghost" onClick={() => { setSeconds(0); dispatch({ type: "RETRY_MATCH" }); }}>다시 예측하기</button>}</section>}

    </main>
  );
}

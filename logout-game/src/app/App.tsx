import { useState } from "react";
import { BrowserShell } from "../browser/BrowserShell";
import { ToastRegion } from "../components/ToastRegion";
import { useGameState } from "../state/GameStateContext";

export function App() {
  const { state, dispatch } = useGameState();
  const [introOpen, setIntroOpen] = useState(() => !Object.values(state.visitedPages).some(Boolean) && !state.endingSeen);
  const [endingConfirmOpen, setEndingConfirmOpen] = useState(false);
  const [endingActive, setEndingActive] = useState(state.endingSeen);

  function startEnding() {
    dispatch({ type: "MARK_ENDING_SEEN" });
    setEndingConfirmOpen(false);
    setEndingActive(true);
  }

  if (endingActive) {
    return <EndingScreen onRestart={() => { dispatch({ type: "RESET_GAME" }); setEndingActive(false); setIntroOpen(true); }} />;
  }

  return (
    <>
      <BrowserShell onEndingAnswer={() => setEndingConfirmOpen(true)} onReset={() => setIntroOpen(true)} />
      <ToastRegion />
      {introOpen && <div className="intro-overlay"><section className="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title"><span className="intro-symbol">⌁</span><h1 id="intro-title">당신은 웹사이트에 갇혔다.</h1><p>페이지를 탐색해 나가는 방법을 찾아라.</p><button className="button primary" onClick={() => setIntroOpen(false)}>포털 열기</button><small>마우스와 키보드로 브라우저의 모든 기능을 사용할 수 있습니다.</small></section></div>}
      {endingConfirmOpen && <div className="modal-backdrop"><section className="confirm-modal ending-confirm" role="dialog" aria-modal="true" aria-labelledby="ending-confirm-title"><span className="eyebrow">검색 결과</span><h2 id="ending-confirm-title">세션을 종료하시겠습니까?</h2><p>지금까지의 진행은 이 선택을 확인하기 전까지 그대로 유지됩니다.</p><div className="modal-actions"><button className="button primary" onClick={startEnding}>예</button><button className="button ghost" onClick={() => setEndingConfirmOpen(false)}>아니오</button></div></section></div>}
    </>
  );
}

function EndingScreen({ onRestart }: { onRestart: () => void }) {
  const [newPage, setNewPage] = useState(false);
  if (newPage) {
    return <main className="new-page-screen"><div className="morning-light" /><section><span className="blinking-cursor" aria-hidden="true" /><h1>새 페이지</h1><p>아직 아무것도 적히지 않았습니다.<br />그래서 무엇이든 천천히 시작할 수 있습니다.</p><button className="button ghost" onClick={onRestart}>처음부터 다시 보기</button></section></main>;
  }
  return <main className="ending-screen"><div className="ending-browser"><div className="ending-block b1" /><div className="ending-block b2" /><div className="ending-block b3" /><div className="ending-block b4" /></div><section className="ending-copy" aria-live="polite"><p style={{ "--delay": "1.5s" } as React.CSSProperties}>문은 처음부터 잠겨 있지 않았습니다.</p><p style={{ "--delay": "3.6s" } as React.CSSProperties}>이곳은 한동안 당신을 지켜준 피난처였습니다.</p><p style={{ "--delay": "5.7s" } as React.CSSProperties}>쉬었던 시간은 잘못이 아닙니다.</p><p style={{ "--delay": "7.8s" } as React.CSSProperties}>아직 두렵지만, 당신은 다음 페이지를 열기로 했습니다.</p><div className="ending-actions"><button className="button primary" onClick={() => setNewPage(true)}>새 페이지 열기</button><button className="button ghost" onClick={onRestart}>처음부터 다시 보기</button></div></section></main>;
}

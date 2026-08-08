import { AdventureCanvas } from "../minigame/AdventureCanvas";
import { useGameState } from "../state/GameStateContext";
export function AdGamePage() {
  const { state, dispatch, notify } = useGameState();

  function useKey() {
    if (state.adGame.keyUsed) return;
    if (state.inventory.selectedItem === "key" && state.inventory.key === "owned") {
      dispatch({ type: "USE_KEY" });
      notify("고대 열쇠를 사용했습니다. G의 전설이 시작됩니다.");
    } else if (state.inventory.key === "owned") {
      notify("잠긴 장치가 미세하게 떨리다 멈춘다.");
    } else {
      notify("잠긴 장치는 아무 반응도 하지 않는다.");
    }
  }

  return (
    <main className="ad-game-page page-inner">
      <header className="arcade-header"><div><span className="pixel-label">CLASSIC ACTION RPG</span><h1>G의 전설</h1></div><span>초원 너머 검은 성에서 전설이 기다립니다</span></header>
      {!state.adGame.keyUsed ? (
        <section className="arcade-cabinet">
          <div className="cabinet-screen"><div className="pixel-castle" aria-hidden="true"><i /><i /><i /></div><h2>THE LEGEND OF G</h2><p>WASD · SPACE · E</p></div>
          <button className={`key-slot ${state.inventory.selectedItem === "key" ? "item-target" : ""}`} onClick={useKey}><span>⚿</span><b>KEY</b><small>{state.inventory.key === "missing" ? "LOCKED" : state.inventory.selectedItem === "key" ? "UNLOCK" : "···"}</small></button>
        </section>
      ) : state.adGame.checkpoint === "clear" ? (
        <section className="adventure-clear"><div className="shield-reward" aria-hidden="true"><span>G</span></div><span className="pixel-label">QUEST COMPLETE</span><h2>G의 전설</h2><p>공주는 구출되었고, G의 방패는 화면을 건너 당신의 단서가 되었습니다.</p><div className="modal-actions"><button className="button primary" onClick={() => dispatch({ type: "REPLAY_ADVENTURE" })}>REPLAY</button><button className="button ghost" onClick={() => dispatch({ type: "NAVIGATE", page: "portal" })}>포털로 돌아가기</button></div></section>
      ) : <AdventureCanvas />}
    </main>
  );
}

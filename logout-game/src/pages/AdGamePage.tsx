import { AdventureCanvas } from "../minigame/AdventureCanvas";
import { useGameState } from "../state/GameStateContext";
export function AdGamePage() {
  const { state, dispatch, notify } = useGameState();

  function insertCoin() {
    if (state.adGame.coinInserted) return;
    if (state.inventory.selectedItem === "coin" && state.inventory.coin === "owned") {
      dispatch({ type: "INSERT_COIN" });
      notify("게임 코인을 사용했습니다. 모험이 시작됩니다.");
    } else if (state.inventory.coin === "owned") {
      notify("금속 투입구가 미세하게 떨리다 멈춘다.");
    } else {
      notify("동전 투입구는 아무 반응도 하지 않는다.");
    }
  }

  return (
    <main className="ad-game-page page-inner">
      <header className="arcade-header"><div><span className="pixel-label">PORTAL MINI ADVENTURE</span><h1>빛의 모험</h1></div><span>오늘도 모험은 기다립니다</span></header>
      {!state.adGame.coinInserted ? (
        <section className="arcade-cabinet">
          <div className="cabinet-screen"><div className="pixel-castle" aria-hidden="true"><i /><i /><i /></div><h2>INSERT COIN</h2><p>WASD · SPACE · E</p></div>
          <button className={`coin-slot ${state.inventory.selectedItem === "coin" ? "item-target" : ""}`} onClick={insertCoin}><span>◎</span><b>COIN</b><small>{state.inventory.coin === "missing" ? "EMPTY" : state.inventory.selectedItem === "coin" ? "INSERT" : "···"}</small></button>
        </section>
      ) : state.adGame.checkpoint === "clear" ? (
        <section className="adventure-clear"><div className="shield-reward" aria-hidden="true"><span>G</span></div><span className="pixel-label">QUEST COMPLETE</span><h2>ADVENTURE SAVED</h2><p>작은 활과 방패는 화면을 건너 당신의 기록에 남았습니다.</p><div className="modal-actions"><button className="button primary" onClick={() => dispatch({ type: "REPLAY_ADVENTURE" })}>REPLAY</button><button className="button ghost" onClick={() => dispatch({ type: "NAVIGATE", page: "portal" })}>포털로 돌아가기</button></div></section>
      ) : <AdventureCanvas />}
    </main>
  );
}

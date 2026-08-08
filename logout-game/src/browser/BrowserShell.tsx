import { useEffect, useState } from "react";
import { AdGamePage } from "../pages/AdGamePage";
import { NewsPage } from "../pages/NewsPage";
import { PortalPage } from "../pages/PortalPage";
import { ShopPage } from "../pages/ShopPage";
import { SportsPage } from "../pages/SportsPage";
import { useGameState } from "../state/GameStateContext";
import { BrowserToolbar } from "./BrowserToolbar";
import { FindInPage } from "./FindInPage";
import { InventoryDrawer } from "./InventoryDrawer";

type Props = {
  onEndingAnswer: () => void;
  onReset: () => void;
};

export function BrowserShell({ onEndingAnswer, onReset }: Props) {
  const { state, dispatch } = useGameState();
  const [findOpen, setFindOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  useEffect(() => {
    if (!state.inventory.selectedItem) return;
    const move = (event: MouseEvent) => setPointer({ x: event.clientX, y: event.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [state.inventory.selectedItem]);

  let page;
  switch (state.currentPage) {
    case "news": page = <NewsPage />; break;
    case "shop": page = <ShopPage />; break;
    case "sports": page = <SportsPage />; break;
    case "ad-game": page = <AdGamePage />; break;
    default: page = <PortalPage onEndingAnswer={onEndingAnswer} />;
  }

  return (
    <div className={`game-app ${state.browser.darkMode ? "dark" : "light"}`}>
      <div className="browser-window">
        <BrowserToolbar onRefresh={() => setRefreshKey((key) => key + 1)} onFind={() => setFindOpen(true)} onReset={() => setResetOpen(true)} />
        {findOpen && <FindInPage page={state.currentPage} onClose={() => setFindOpen(false)} />}
        <div key={`${state.currentPage}-${refreshKey}`} className={`page-viewport zoom-${state.browser.zoomPercent}`} data-page={state.currentPage}>
          {page}
        </div>
        <InventoryDrawer />
      </div>
      {state.inventory.selectedItem && <div className="selected-item-cursor" style={{ left: pointer.x + 14, top: pointer.y + 14 }} aria-hidden="true">{state.inventory.selectedItem === "water" ? "◒" : "⚿"}</div>}
      {resetOpen && <div className="modal-backdrop"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">진행을 초기화할까요?</h2><p>방문 기록, 아이템, 문자 단서와 페이지 진행이 모두 처음 상태로 돌아갑니다.</p><div className="modal-actions"><button className="button danger" onClick={() => { dispatch({ type: "RESET_GAME" }); setResetOpen(false); onReset(); }}>초기화</button><button className="button ghost" onClick={() => setResetOpen(false)}>취소</button></div></section></div>}
    </div>
  );
}

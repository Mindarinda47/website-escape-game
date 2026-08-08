import { useEffect } from "react";
import { useGameState } from "../state/GameStateContext";
import { letterValues, selectCollectedLetters } from "../state/selectors";
import type { ItemId } from "../state/types";
import waterItemIcon from "../image/products/생수아이콘.png";

export function InventoryDrawer() {
  const { state, dispatch } = useGameState();
  const letters = selectCollectedLetters(state);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key.toLowerCase() === "i") {
        dispatch({ type: "SET_INVENTORY_PINNED", value: !state.browser.inventoryPinned });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, state.browser.inventoryPinned]);

  function select(item: ItemId) {
    if (state.inventory[item] !== "owned") return;
    dispatch({ type: "SELECT_ITEM", item: state.inventory.selectedItem === item ? null : item });
  }

  return (
    <aside className={`inventory-drawer ${state.browser.inventoryPinned ? "pinned" : ""}`} aria-label="인벤토리와 문자 단서">
      <div className="drawer-handle"><span>인벤토리</span><kbd>I</kbd></div>
      <div className="drawer-content">
        <section>
          <div className="drawer-heading"><h2>사용 아이템</h2><button aria-label={state.browser.inventoryPinned ? "인벤토리 고정 해제" : "인벤토리 고정"} onClick={() => dispatch({ type: "SET_INVENTORY_PINNED", value: !state.browser.inventoryPinned })}>{state.browser.inventoryPinned ? "● 고정됨" : "○ 고정"}</button></div>
          <div className="item-slots">
            {state.inventory.water === "missing" ? <div className="empty-item-slot" aria-label="빈 아이템 슬롯" /> : (
              <button className={state.inventory.selectedItem === "water" ? "selected" : ""} disabled={state.inventory.water === "used"} onClick={() => select("water")}>
                <span className="item-icon water-icon"><img src={waterItemIcon} alt="" /></span><b>생수</b><small>{state.inventory.water === "used" ? "사용됨" : "보관 중"}</small>
              </button>
            )}
            {state.inventory.banknote === "missing" ? <div className="empty-item-slot" aria-label="빈 아이템 슬롯" /> : (
              <button className={state.inventory.selectedItem === "banknote" ? "selected" : ""} disabled={state.inventory.banknote === "used"} onClick={() => select("banknote")}>
                <span className="item-icon banknote-icon">₩</span><b>5만원권</b><small>{state.inventory.banknote === "used" ? "사용됨" : "보관 중"}</small>
              </button>
            )}
            {state.inventory.key === "missing" ? <div className="empty-item-slot" aria-label="빈 아이템 슬롯" /> : (
              <button className={state.inventory.selectedItem === "key" ? "selected" : ""} disabled={state.inventory.key === "used"} onClick={() => select("key")}>
                <span className="item-icon key-icon">⚿</span><b>고대 열쇠</b><small>{state.inventory.key === "used" ? "사용됨" : "보관 중"}</small>
              </button>
            )}
          </div>
        </section>
        <section>
          <div className="drawer-heading"><h2>문자 단서</h2></div>
          <div className="letter-slots" aria-label="발견한 순서와 무관한 문자 조각">
            {letters.length === 0 && <span className="empty-letter-slot" aria-label="아직 발견한 문자 단서가 없습니다" />}
            {letters.map((clue) => <span key={clue} className="filled">{letterValues[clue]}</span>)}
          </div>
        </section>
      </div>
    </aside>
  );
}

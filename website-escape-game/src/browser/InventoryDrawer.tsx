import { useEffect, useMemo, useRef, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import { letterValues, selectCollectedHints, selectCollectedLetters } from "../state/selectors";
import type { HintId, ItemId, LetterClueId } from "../state/types";
import waterItemIcon from "../image/products/생수아이콘.png";
import keyItemIcon from "../image/열쇠아이템아이콘.png";
import { adventureText, inventoryText } from "../content/text";

type AcquisitionTarget = ItemId | LetterClueId | HintId | "points";

export function InventoryDrawer() {
  const { state, dispatch } = useGameState();
  const letters = useMemo(() => selectCollectedLetters(state), [state]);
  const hints = useMemo(() => selectCollectedHints(state), [state]);
  const [autoOpen, setAutoOpen] = useState(false);
  const [highlightedAcquisition, setHighlightedAcquisition] = useState<AcquisitionTarget | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const previousInventoryRef = useRef({
    water: state.inventory.water,
    key: state.inventory.key,
    points: state.inventory.points,
    letters,
    hints,
  });

  useEffect(() => {
    const previous = previousInventoryRef.current;
    const acquiredLetter = letters.find((clue) => !previous.letters.includes(clue));
    const acquiredHint = hints.find((hint) => !previous.hints.includes(hint));
    let acquired: AcquisitionTarget | null = null;
    if (previous.water === "missing" && state.inventory.water === "owned") acquired = "water";
    else if (previous.key === "missing" && state.inventory.key === "owned") acquired = "key";
    else if (state.inventory.points > previous.points) acquired = "points";
    else if (acquiredLetter) acquired = acquiredLetter;
    else if (acquiredHint) acquired = acquiredHint;
    previousInventoryRef.current = {
      water: state.inventory.water,
      key: state.inventory.key,
      points: state.inventory.points,
      letters,
      hints,
    };
    if (!acquired) return;
    if (autoCloseTimerRef.current !== null) window.clearTimeout(autoCloseTimerRef.current);
    setHighlightedAcquisition(acquired);
    if (!state.browser.inventoryPinned) setAutoOpen(true);
    autoCloseTimerRef.current = window.setTimeout(() => {
      setAutoOpen(false);
      setHighlightedAcquisition(null);
      autoCloseTimerRef.current = null;
    }, 2400);
  }, [hints, letters, state.browser.inventoryPinned, state.inventory.key, state.inventory.points, state.inventory.water]);

  useEffect(() => () => {
    if (autoCloseTimerRef.current !== null) window.clearTimeout(autoCloseTimerRef.current);
  }, []);

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
    <aside className={`inventory-drawer ${state.browser.inventoryPinned ? "pinned" : autoOpen ? "auto-open" : ""}`} aria-label="인벤토리와 문자 단서">
      <div className="drawer-handle"><span>{inventoryText.title}</span><kbd>I</kbd></div>
      <div className={`drawer-content ${hints.length > 0 ? "has-hints" : ""}`}>
        <section>
          <div className="drawer-heading"><h2>{inventoryText.itemsTitle}</h2><button aria-label={state.browser.inventoryPinned ? "인벤토리 고정 해제" : "인벤토리 고정"} onClick={() => dispatch({ type: "SET_INVENTORY_PINNED", value: !state.browser.inventoryPinned })}>{state.browser.inventoryPinned ? "● 고정됨" : "○ 고정"}</button></div>
          <div className="item-slots">
            {state.inventory.water === "missing" ? <div className="empty-item-slot" aria-label="빈 아이템 슬롯" /> : (
              <button className={`${state.inventory.selectedItem === "water" ? "selected" : ""} ${highlightedAcquisition === "water" ? "acquired" : ""}`} disabled={state.inventory.water === "used"} onClick={() => select("water")}>
                <span className="item-icon water-icon"><img src={waterItemIcon} alt="" /></span><b>{inventoryText.water}</b><small>{state.inventory.water === "used" ? inventoryText.used : inventoryText.stored}</small>
              </button>
            )}
            <div className={`point-balance ${highlightedAcquisition === "points" ? "acquired" : ""}`}><span className="item-icon point-icon">P</span><b>{inventoryText.points}</b><small>{state.inventory.points.toLocaleString("ko-KR")}P</small></div>
            {state.inventory.key === "missing" ? <div className="empty-item-slot" aria-label="빈 아이템 슬롯" /> : (
              <button className={`${state.inventory.selectedItem === "key" ? "selected" : ""} ${highlightedAcquisition === "key" ? "acquired" : ""}`} disabled={state.inventory.key === "used"} onClick={() => select("key")}>
                <span className="item-icon key-icon"><img src={keyItemIcon} alt="" /></span><b>{inventoryText.key}</b><small>{state.inventory.key === "used" ? inventoryText.used : inventoryText.stored}</small>
              </button>
            )}
          </div>
        </section>
        <section>
          <div className="drawer-heading"><h2>{inventoryText.lettersTitle}</h2></div>
          <div className="letter-slots" aria-label="발견한 순서와 무관한 문자 조각">
            {letters.length === 0 && <span className="empty-letter-slot" aria-label="아직 발견한 문자 단서가 없습니다" />}
            {letters.map((clue) => <span key={clue} className={`filled ${highlightedAcquisition === clue ? "acquired" : ""}`}>{letterValues[clue]}</span>)}
          </div>
        </section>
        {hints.length > 0 && <section className="inventory-hints">
          <div className="drawer-heading"><h2>{inventoryText.hintsTitle}</h2></div>
          <div className="hint-list">
            {hints.map((hint) => <article key={hint} className={`hint-card ${highlightedAcquisition === hint ? "acquired" : ""}`}>{adventureText.treasure.hints[hint]}</article>)}
          </div>
        </section>}
      </div>
    </aside>
  );
}

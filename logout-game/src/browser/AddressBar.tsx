import { useEffect, useState } from "react";
import { useGameState } from "../state/GameStateContext";
import { pageAddresses } from "../state/selectors";
import type { PageId } from "../state/types";

const addressToPage: Record<string, PageId> = {
  "portal.local": "portal",
  "portal.local/home": "portal",
  "portal.local/news": "news",
  "portal.local/news/today": "news",
  "portal.local/shop": "shop",
  "portal.local/sports": "sports",
  "portal.local/sports/round-12": "sports",
  "portal.local/ads/hero": "ad-game",
  "portal.local/game": "ad-game",
};

export function AddressBar() {
  const { state, dispatch, notify } = useGameState();
  const special = state.currentPage === "sports" && state.sports.specialAddressUnlocked;
  const address = special ? "portal.local/sports/rOund-12" : pageAddresses[state.currentPage];
  const [value, setValue] = useState(address);
  const [focused, setFocused] = useState(false);

  useEffect(() => setValue(address), [address]);

  function collectSportsLetter() {
    if (state.collectedLetters["sports-o"]) return;
    dispatch({ type: "COLLECT_LETTER", clue: "sports-o" });
    notify("문자 단서 O를 획득했습니다.");
  }

  function submit() {
    if (special && value === address && !state.collectedLetters["sports-o"]) {
      collectSportsLetter();
      return;
    }
    const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const page = addressToPage[normalized];
    if (page) dispatch({ type: "NAVIGATE", page });
    else {
      notify("이 주소의 페이지를 찾을 수 없습니다.");
      setValue(address);
    }
  }

  return (
    <div className={`address-bar ${special ? "address-special" : ""}`}>
      <span className="address-security" aria-hidden="true">⌁</span>
      <input
        aria-label="주소창"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => { setFocused(true); event.currentTarget.select(); }}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
        spellCheck={false}
      />
      {focused && special && !state.collectedLetters["sports-o"] && (
        <button
          className="address-clue"
          aria-label="주소의 대문자 O 수집"
          onMouseDown={(event) => event.preventDefault()}
          onClick={collectSportsLetter}
        >O</button>
      )}
    </div>
  );
}

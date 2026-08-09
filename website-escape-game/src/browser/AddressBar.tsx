import { useEffect, useRef, useState } from "react";
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
  "portal.local/sports/r und-12": "sports",
  "portal.local/ads/hero": "ad-game",
  "portal.local/game": "ad-game",
};

export function AddressBar() {
  const { state, dispatch, notify } = useGameState();
  const special = state.currentPage === "sports" && state.sports.specialAddressUnlocked;
  const sportsLetterCollected = state.collectedLetters["sports-o"];
  const address = special
    ? sportsLetterCollected ? "portal.local/sports/r und-12" : "portal.local/sports/rOund-12"
    : pageAddresses[state.currentPage];
  const [value, setValue] = useState(address);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(address), [address]);

  function collectSportsLetter() {
    if (state.collectedLetters["sports-o"]) return;
    dispatch({ type: "COLLECT_LETTER", clue: "sports-o" });
    notify("문자 단서 O를 획득했습니다.");
  }

  function submit() {
    const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const page = addressToPage[normalized];
    if (page) dispatch({ type: "NAVIGATE", page });
    else {
      notify("이 주소의 페이지를 찾을 수 없습니다.");
      setValue(address);
    }
  }

  function beginEditingAddress() {
    setFocused(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  const showClickableAddress = special && !focused && value === address;

  return (
    <div className={`address-bar ${special ? "address-special" : ""}`}>
      <span className="address-security" aria-hidden="true">⌁</span>
      {showClickableAddress ? (
        <div className="address-inline" role="textbox" tabIndex={0} aria-label="주소창" onClick={beginEditingAddress} onKeyDown={(event) => { if (event.key === "Enter") beginEditingAddress(); }}>
          <span>portal.local/sports/r</span>
          {sportsLetterCollected
            ? <span className="address-inline-blank" aria-hidden="true"> </span>
            : <button className="address-inline-letter" aria-label="주소의 대문자 O 수집" onClick={(event) => { event.stopPropagation(); collectSportsLetter(); }}>O</button>}
          <span>und-12</span>
        </div>
      ) : (
        <input
          ref={inputRef}
          aria-label="주소창"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={(event) => { setFocused(true); event.currentTarget.select(); }}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
          spellCheck={false}
        />
      )}
    </div>
  );
}

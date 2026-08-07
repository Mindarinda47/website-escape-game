import { useState } from "react";
import { useGameState } from "../state/GameStateContext";
import type { ContentPageId } from "../state/types";

type Props = { onShowCompletion: (page: ContentPageId) => void };
type Product = { id: string; name: string; price: string; icon: string; tone: string };

const products: Product[] = [
  { id: "water", name: "맑은틈 생수 500ml", price: "무료 샘플", icon: "◒", tone: "aqua" },
  { id: "card", name: "별자리 트레이딩 카드", price: "4,800원", icon: "✦", tone: "violet" },
  { id: "lamp", name: "느린 밤 독서등", price: "18,900원", icon: "◐", tone: "amber" },
  { id: "mug", name: "한숨 머그", price: "9,600원", icon: "∪", tone: "rose" },
  { id: "plant", name: "작은 창가 화분", price: "12,400원", icon: "♧", tone: "green" },
  { id: "clock", name: "오늘만 가리키는 시계", price: "21,000원", icon: "◷", tone: "blue" },
  { id: "blanket", name: "구름결 담요", price: "28,500원", icon: "≈", tone: "cream" },
  { id: "notebook", name: "다음 장 노트", price: "6,200원", icon: "▤", tone: "slate" },
];

export function ShopPage({ onShowCompletion }: Props) {
  const { state, dispatch, notify } = useGameState();
  const [detail, setDetail] = useState<Product | null>(null);

  function collectWater() {
    if (state.inventory.water !== "missing") return;
    dispatch({ type: "COLLECT_WATER" });
    notify("무료 샘플이 장바구니 대신 화면 아래로 미끄러졌다.");
  }

  function collectLetter(clue: "shop-t" | "shop-l", letter: string) {
    if (state.collectedLetters[clue]) return;
    dispatch({ type: "COLLECT_LETTER", clue });
    notify(`문자 단서 ${letter}를 발견했습니다.`);
  }

  function openProduct(product: Product) {
    setDetail(product);
    if (product.id === "card") dispatch({ type: "OPEN_CARD_DETAIL" });
  }

  return (
    <main className="shop-page page-inner">
      <header className="site-header shop-header"><div><span className="site-kicker">오늘을 모으는 상점</span><h1>모아상점</h1></div><div className="shop-tools"><span>오늘의 랭킹</span><span>장바구니 0</span></div></header>
      <div className="notice-bar">재고가 <mark>마지막</mark> 하나뿐인 상품도 있습니다.</div>
      <section className="product-grid" aria-label="추천 상품">
        {products.map((product, index) => (
          <button key={product.id} className={`product-card ${product.id === "card" ? "shimmer" : ""}`} onClick={() => openProduct(product)}>
            <span className={`product-art ${product.tone}`}>{product.icon}</span><small>오늘의 랭킹 {index + 1}</small><strong>{product.name}</strong><span>{product.price}</span>
          </button>
        ))}
      </section>
      {state.shop.hiddenStockRevealed && (
        <section className="hidden-stock highlight-result">
          <div className="product-art slate">⌁</div><div><small>숨은 재고 · 품절 임박</small><h2>오래된 여행 태그</h2><p>창고 가장 안쪽에서 발견된 단 하나의 상품입니다.</p></div>
          <button className="last-one" disabled={state.collectedLetters["shop-l"]} onClick={() => collectLetter("shop-l", "L")}><b>L</b>ast one</button>
        </section>
      )}
      {state.completionNotified.shop && <button className="replay-message" onClick={() => onShowCompletion("shop")}>완료 메시지 다시 보기</button>}

      {detail && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
            <button className="modal-close" aria-label="상품 상세 닫기" onClick={() => setDetail(null)}>×</button>
            <div className={`product-detail-art ${detail.tone}`}>{detail.icon}</div>
            <div className="product-detail-copy"><span className="eyebrow">오늘의 추천 상품</span><h2 id="product-title">{detail.name}</h2><p>오랫동안 같은 진열대에 머물러 있던 상품입니다.</p><strong>{detail.price}</strong>
              {detail.id === "water" && <button className="button primary" disabled={state.inventory.water !== "missing"} onClick={collectWater}>{state.inventory.water === "missing" ? "무료 샘플 받기" : "샘플 수령 완료"}</button>}
              {detail.id === "card" && <div className={`fine-print zoom-${state.browser.zoomPercent}`}><span>수집 카드 뒷면 · 제조 인쇄</span>{state.browser.zoomPercent >= 150 ? <button disabled={state.collectedLetters["shop-t"]} onClick={() => collectLetter("shop-t", "T")} aria-label="문자 단서 T 수집">T</button> : state.browser.zoomPercent >= 125 ? <b aria-hidden="true">?</b> : <i>인쇄 상태 불량</i>}</div>}
              {detail.id !== "water" && detail.id !== "card" && <button className="button ghost" onClick={() => notify("장바구니는 아직 비어 있는 채로 두었습니다.")}>장바구니에 담기</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

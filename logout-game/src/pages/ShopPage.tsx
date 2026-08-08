import { useState } from "react";
import { useGameState } from "../state/GameStateContext";
import waterProductImage from "../image/products/생수.png";
import cardProductImage from "../image/products/트레이딩 카드.png";
import cardZoomImage from "../image/products/카드확대.png";
import consoleProductImage from "../image/products/게임기상품.png";
import watchProductImage from "../image/products/손목시계상품.png";
import shoesProductImage from "../image/products/신발상품.png";
import travelProductImage from "../image/products/여행패키지.png";
import keyProductImage from "../image/products/열쇠상품.png";
import dressProductImage from "../image/products/원피스상품.png";

type Product = { id: string; name: string; price: string; image: string };

const products: Product[] = [
  { id: "water", name: "맑은샘 생수 500ml", price: "무료 샘플", image: waterProductImage },
  { id: "card", name: "코레몬 카드 세트", price: "12,000원", image: cardProductImage },
  { id: "console", name: "NOVA X 게임 콘솔", price: "398,000원", image: consoleProductImage },
  { id: "watch", name: "클래식 네이비 손목시계", price: "129,000원", image: watchProductImage },
  { id: "shoes", name: "어반 레더 스니커즈", price: "89,000원", image: shoesProductImage },
  { id: "travel", name: "코발트 아일랜드 3박 4일", price: "1,290,000원", image: travelProductImage },
  { id: "dress", name: "마린 네이비 원피스", price: "79,000원", image: dressProductImage },
  { id: "key", name: "빛의 모험 고대 열쇠", price: "50,000원", image: keyProductImage },
];

const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

export function ShopPage() {
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
    notify(`문자 단서 ${letter}를 획득했습니다.`);
  }

  function buyKey() {
    if (state.inventory.key !== "missing") return;
    if (state.inventory.banknote !== "owned") {
      notify("결제 수단의 잔액이 부족합니다.");
      return;
    }
    dispatch({ type: "BUY_KEY" });
    notify("빛의 모험 고대 열쇠를 구매했습니다.");
  }

  function openProduct(product: Product) {
    setDetail(product);
    if (product.id === "card") dispatch({ type: "OPEN_CARD_DETAIL" });
  }

  return (
    <main className="shop-page page-inner">
      <header className="site-header shop-header"><div><span className="site-kicker">오늘을 모으는 상점</span><h1>GOGLE SHOP</h1></div><div className="shop-tools"><span>오늘의 랭킹</span><span>장바구니 0</span></div></header>
      <div className="notice-bar">재고가 <mark>마지막</mark> 하나뿐인 상품도 있습니다.</div>
      <section className="product-grid" aria-label="추천 상품">
        {shuffledProducts.map((product, index) => (
          <button key={product.id} className={`product-card ${product.id === "card" ? "shimmer" : ""}`} onClick={() => openProduct(product)}>
            <span className="product-art"><img src={product.image} alt="" /></span><small>오늘의 랭킹 {index + 1}</small><strong>{product.name}</strong><span>{product.price}</span>
          </button>
        ))}
      </section>
      {state.shop.hiddenStockRevealed && (
        <section className="hidden-stock highlight-result">
          <div className="product-art slate">⌁</div><div><small>숨은 재고 · 품절 임박</small><h2>오래된 여행 태그</h2><p>창고 가장 안쪽에서 발견된 단 하나의 상품입니다.</p></div>
          <button className="last-one" disabled={state.collectedLetters["shop-l"]} onClick={() => collectLetter("shop-l", "L")}><b>L</b>ast one</button>
        </section>
      )}

      {detail && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
            <button className="modal-close" aria-label="상품 상세 닫기" onClick={() => setDetail(null)}>×</button>
            <div className={`product-detail-art ${detail.id === "card" && state.browser.zoomPercent >= 150 ? "card-zoom-art" : ""}`}>
              <img src={detail.id === "card" && state.browser.zoomPercent >= 150 ? cardZoomImage : detail.image} alt="" />
              {detail.id === "card" && state.browser.zoomPercent >= 150 && !state.collectedLetters["shop-t"] && <button className="card-letter-t" onClick={() => collectLetter("shop-t", "T")} aria-label="문자 단서 T 수집">T</button>}
            </div>
            <div className="product-detail-copy"><span className="eyebrow">오늘의 추천 상품</span><h2 id="product-title">{detail.name}</h2><p>오랫동안 같은 진열대에 머물러 있던 상품입니다.</p><strong>{detail.price}</strong>
              {detail.id === "water" && <button className="button primary" disabled={state.inventory.water !== "missing"} onClick={collectWater}>{state.inventory.water === "missing" ? "무료 샘플 받기" : "샘플 수령 완료"}</button>}
              {detail.id === "card" && state.browser.zoomPercent < 150 && <small className="product-detail-note">카드의 인쇄면이 유난히 세밀합니다.</small>}
              {detail.id === "key" && <button className="button primary" disabled={state.inventory.key !== "missing"} onClick={buyKey}>{state.inventory.key === "missing" ? "50,000원 결제" : "구매 완료"}</button>}
              {detail.id !== "water" && detail.id !== "card" && detail.id !== "key" && <button className="button ghost" onClick={() => notify("장바구니는 아직 비어 있는 채로 두었습니다.")}>장바구니에 담기</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

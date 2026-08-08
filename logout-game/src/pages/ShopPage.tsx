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
import legendLImage from "../image/L.png";

type Product = { id: string; name: string; price: string; image: string; description: string };

const products: Product[] = [
  { id: "water", name: "맑은샘 생수 500ml", price: "무료 샘플", image: waterProductImage, description: "휴대하기 편한 500ml 생수입니다. 차갑게 보관해 산뜻한 상태로 배송됩니다." },
  { id: "card", name: "코레몬 카드 세트", price: "12,000원", image: cardProductImage, description: "엄청난 유행몰이 중인 코레몬 카드 세트입니다. 불과 물 속성 캐릭터 카드가 함께 들어 있습니다." },
  { id: "console", name: "NOVA X 게임 콘솔", price: "398,000원", image: consoleProductImage, description: "빠른 로딩과 정밀한 컨트롤을 지원하는 거실형 게임 콘솔입니다. 무선 컨트롤러 1개가 포함됩니다." },
  { id: "watch", name: "클래식 네이비 손목시계", price: "129,000원", image: watchProductImage, description: "짙은 네이비 다이얼과 가죽 스트랩을 조합한 아날로그 손목시계입니다. 일상과 격식 있는 자리 모두에 어울립니다." },
  { id: "shoes", name: "어반 레더 스니커즈", price: "89,000원", image: shoesProductImage, description: "부드러운 가죽과 쿠션 밑창을 사용한 데일리 스니커즈입니다. 차분한 배색으로 다양한 옷에 자연스럽게 어울립니다." },
  { id: "travel", name: "코발트 아일랜드 3박 4일 패키지", price: "1,290,000원", image: travelProductImage, description: "푸른 해변 리조트 3박과 왕복 항공권을 포함한 휴양 패키지입니다. 조식과 공항 이동 서비스가 제공됩니다." },
  { id: "dress", name: "마린 네이비 원피스", price: "79,000원", image: dressProductImage, description: "가볍게 흐르는 소재와 단정한 허리선이 특징인 네이비 원피스입니다. 여름 외출과 휴양지에 잘 어울립니다." },
  { id: "key", name: "아주 평범한 열쇠", price: "50,000P", image: keyProductImage, description: "출처와 용도를 알 수 없는 오래된 열쇠입니다. 표면의 푸른 보석이 희미하게 빛나고 있습니다." },
];

const shuffledProducts = [...products].sort(() => Math.random() - 0.5);

export function ShopPage() {
  const { state, dispatch, notify } = useGameState();
  const [detail, setDetail] = useState<Product | null>(null);

  function collectWater() {
    if (state.inventory.water !== "missing") return;
    dispatch({ type: "COLLECT_WATER" });
    notify("생수가 인벤토리에 추가되었습니다.");
  }

  function collectLetter(clue: "shop-t" | "shop-l", letter: string) {
    if (state.collectedLetters[clue]) return;
    dispatch({ type: "COLLECT_LETTER", clue });
    notify(`문자 단서 ${letter}를 획득했습니다.`);
  }

  function buyKey() {
    if (state.inventory.key !== "missing") return;
    if (state.inventory.points < 50000) {
      notify("보유 포인트가 부족합니다.");
      return;
    }
    dispatch({ type: "BUY_KEY" });
    notify("50,000P를 사용해 열쇠를 구매했습니다.");
  }

  function openProduct(product: Product) {
    setDetail(product);
    if (product.id === "card") dispatch({ type: "OPEN_CARD_DETAIL" });
  }

  return (
    <main className="shop-page page-inner">
      <header className="site-header shop-header"><div><span className="site-kicker">오늘을 모으는 상점</span><h1>GOGLE SHOP</h1></div><div className="shop-tools"><span>오늘의 랭킹</span><span>장바구니 0</span></div></header>
      <div className="notice-bar">오늘 주문한 상품은 결제 확인 후 순차적으로 발송됩니다.</div>
      <section className="product-grid" aria-label="추천 상품">
        {shuffledProducts.map((product, index) => (
          <button key={product.id} className={`product-card ${product.id === "card" ? "shimmer" : ""}`} onClick={() => openProduct(product)}>
            <span className="product-art"><img src={product.image} alt="" /></span><small>오늘의 상품 {index + 1}</small><strong>{product.name}</strong><span>{product.price}</span>
          </button>
        ))}
      </section>
      {state.shop.hiddenStockRevealed && (
        <section className="hidden-stock highlight-result">
          {!state.collectedLetters["shop-l"] ? <button className="hidden-stock-image" onClick={() => collectLetter("shop-l", "L")} aria-label="레전드 오브 L 상품 이미지"><img src={legendLImage} alt="" /></button> : <div className="hidden-stock-image empty" aria-label="비어 있는 상품 이미지 영역" />}
          <div><small>숨은 재고 · 단 하나</small><h2>레전드 오브 L</h2><p>오랫동안 목록에서 사라져 있던 정체불명의 한정 상품입니다.</p></div>
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
            <div className="product-detail-copy"><span className="eyebrow">오늘의 추천 상품</span><h2 id="product-title">{detail.name}</h2><p>{detail.description}</p><strong>{detail.price}</strong>
              {detail.id === "water" && <button className="button primary" disabled={state.inventory.water !== "missing"} onClick={collectWater}>{state.inventory.water === "missing" ? "무료 샘플 받기" : "샘플 수령 완료"}</button>}
              {detail.id === "card" && state.browser.zoomPercent < 150 && <small className="product-detail-note">엄청난 퀄리티의 카드 품질!<br />"확대하지 않으면" 보기 힘든 정품 마크 포함!<br />유사품에 주의하세요!</small>}
              {detail.id === "key" && <button className="button primary" disabled={state.inventory.key !== "missing"} onClick={buyKey}>{state.inventory.key === "missing" ? "50,000P 사용" : "구매 완료"}</button>}
              {detail.id !== "water" && detail.id !== "card" && detail.id !== "key" && <button className="button ghost" onClick={() => notify("오류로 인해 장바구니에 추가할 수 없었습니다.")}>장바구니에 담기</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

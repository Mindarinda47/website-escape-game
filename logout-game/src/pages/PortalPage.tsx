import { useState, type FormEvent } from "react";
import { useGameState } from "../state/GameStateContext";
import { isEndingAnswer, selectPageCompleted } from "../state/selectors";
import type { PageId } from "../state/types";
import wildfireImage from "../image/산불.png";
import extinguishedWildfireImage from "../image/산불_꺼진상태.png";
import shopThumbnailImage from "../image/쇼핑몰썸네일.png";
import youthEmploymentImage from "../image/청년_취업난.png";
import libraryExhibitionImage from "../image/밤의도서관전시.png";
import windowPlantsImage from "../image/창가식물.png";
import booksAndSentencesImage from "../image/책과문장.png";
import morningRoomImage from "../image/아침빛이오래머무는방.png";
import gangrimFcImage from "../image/강림FC.png";
import dorimFcImage from "../image/도림FC.png";
import alleyBusinessNewsImage from "../image/골목상권뉴스썸네일.png";
import adventureHeroSprites from "../image/game/hero-sprites.png";

type Props = { onEndingAnswer: () => void };

const newsBriefs = [
  { category: "사회", title: "취업 준비 길어지는 대한민국 청년들… 첫 경력의 문턱도 높아졌다", time: "18분 전", image: youthEmploymentImage },
  { category: "문화", title: "밤의 도서관에서 시작된 조용한 전시", time: "32분 전", image: libraryExhibitionImage },
  { category: "생활", title: "창가에 두기 좋은 작은 식물 다섯 가지", time: "1시간 전", image: windowPlantsImage },
  { category: "경제", title: "치솟는 임대료에 골목 상점 폐업 늘어… 빈 점포 확산", time: "2시간 전", image: alleyBusinessNewsImage },
];

const trending = ["유감산 산불", "산불", "코스피", "칠성전자", "항공권", "날씨", "폭염", "화재", "워터파크", "게임"];
const trendDirections = trending.map((_, index) => {
  const direction = Math.random();
  if (index === 0) return direction < 0.5 ? "―" : "↑";
  if (direction < 1 / 3) return "―";
  return direction < 2 / 3 ? "↑" : "↓";
});

export function PortalPage({ onEndingAnswer }: Props) {
  const { state, dispatch } = useGameState();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  function open(page: PageId) {
    dispatch({ type: "NAVIGATE", page });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (isEndingAnswer(query)) {
      onEndingAnswer();
      return;
    }
    const routes: Array<[string[], PageId]> = [
      [["뉴스", "기사", "news", "산불", "유감산"], "news"],
      [["쇼핑", "상점", "shop", "상품", "무료 샘플"], "shop"],
      [["스포츠", "축구", "경기", "sports", "강림FC", "도림FC"], "sports"],
      [["게임", "모험", "game"], "ad-game"],
    ];
    const route = routes.find(([keywords]) => keywords.some((keyword) => value.includes(keyword)));
    if (route) open(route[1]);
    else setMessage("검색 결과가 없습니다.");
  }

  const newsCompleted = selectPageCompleted(state, "news");
  const shopCompleted = selectPageCompleted(state, "shop");
  const sportsCompleted = selectPageCompleted(state, "sports");
  const gameCompleted = selectPageCompleted(state, "ad-game");

  return (
    <main className="portal-page page-inner">
      <header className="portal-header">
        <div className="portal-brand"><span className="gogle-mark" aria-hidden="true"><i /><i /></span><span>GOGLE</span></div>
        <form className="portal-search" role="search" onSubmit={submit}>
          <label className="sr-only" htmlFor="portal-query">포털 검색</label>
          <input id="portal-query" value={query} onChange={(event) => { setQuery(event.target.value); setMessage(""); }} placeholder="검색어를 입력하세요" autoComplete="off" />
          <button aria-label="검색" className="search-submit">⌕</button>
        </form>
        {message && <p className="search-message" role="status">{message}</p>}
      </header>

      <div className="portal-dashboard">
        <section className="portal-section news-section" aria-labelledby="portal-news-title">
          <div className="section-heading"><div><span>HEADLINE</span><h2 id="portal-news-title">오늘의 뉴스</h2></div><time>오늘</time></div>
          <div className="headline-layout">
            <button className={`headline-story portal-destination ${newsCompleted ? "completed" : ""}`} onClick={() => open("news")}>
              <span className="headline-art" aria-hidden="true"><img src={state.news.fireExtinguished ? extinguishedWildfireImage : wildfireImage} alt="" /></span>
              <span className="headline-copy"><small>새벽일보 · 속보</small><strong>[속보] 유감산 대형산불… “화재 진압에 총동원”</strong><span>짙은 연기로 가려진 산등성이의 현재 상황을 전합니다.</span></span>
            </button>
            <div className="news-brief-list">
              {newsBriefs.map((brief, index) => <article key={brief.title}><span className={`brief-thumb thumb-${index + 1}`} aria-hidden="true">{"image" in brief && brief.image ? <img src={brief.image} alt="" /> : null}</span><div><small>{brief.category}</small><h3>{brief.title}</h3><time>{brief.time}</time></div></article>)}
            </div>
          </div>
        </section>

        <aside className="portal-side-column">
          <section className="weather-widget" aria-label="오늘의 날씨">
            <div><span>오늘의 날씨</span><strong>18°</strong><small>구름 사이 맑음</small></div><span className="weather-symbol" aria-hidden="true">◒</span>
            <p>오후에는 바람이 조금 잦아듭니다.</p>
          </section>
          <section className="trending-widget">
            <div className="widget-heading"><h2>실시간 검색</h2><time>오늘</time></div>
            <ol>{trending.map((term, index) => <li key={term}><b>{index + 1}</b><span>{term}</span><small>{trendDirections[index]}</small></li>)}</ol>
          </section>
        </aside>

        <div className="portal-lower-layout">
          <div className="portal-lower-sections">
            <section className="portal-section life-section" aria-labelledby="portal-life-title">
              <div className="section-heading"><div><span>LIFE</span><h2 id="portal-life-title">라이프스타일</h2></div><p>오늘 둘러볼 만한 것들</p></div>
              <div className="life-grid">
                <button className={`shop-feature portal-destination ${shopCompleted ? "completed" : ""}`} onClick={() => open("shop")}>
                  <span className="shop-feature-art" aria-hidden="true"><img src={shopThumbnailImage} alt="" /></span>
                </button>
                <article className="static-life-card"><span className="static-art reading-art"><img src={booksAndSentencesImage} alt="" /></span><small>책과 문장</small><h3>다음 장을 천천히 여는 방법</h3><p>오늘의 짧은 읽을거리 · 4분</p></article>
                <article className="static-life-card"><span className="static-art room-art"><img src={morningRoomImage} alt="" /></span><small>공간</small><h3>아침빛이 오래 머무는 방</h3><p>작은 집 기록 · 사진 8장</p></article>
              </div>
            </section>

            <section className="portal-section sports-section" aria-labelledby="portal-sports-title">
              <div className="section-heading"><div><span>SPORTS</span><h2 id="portal-sports-title">스포츠</h2></div><p>오늘의 경기와 일정</p></div>
              <div className="sports-grid">
                <button className={`sports-feature portal-destination ${sportsCompleted ? "completed" : ""}`} onClick={() => open("sports")}>
                  <span className="match-date">12라운드 · 오늘</span><span className="mini-match"><span className="mini-crest warm"><img src={gangrimFcImage} alt="" /></span><b>강림FC</b><em>VS</em><b>도림FC</b><span className="mini-crest cool"><img src={dorimFcImage} alt="" /></span></span><span className="match-caption">경기 전 승부 예측이 진행 중입니다</span>
                </button>
                <div className="schedule-card"><h3>오늘의 경기</h3><div><time>17:30</time><span>한빛 FC</span><b>-</b><span>화진 유나이티드</span></div><div><time>20:00</time><span>강림FC</span><b>-</b><span>도림FC</span></div><div><time>22:10</time><span>가온 시티</span><b>-</b><span>태령 FC</span></div></div>
              </div>
            </section>
          </div>

          <button className={`game-ad game-ad-vertical portal-destination ${gameCompleted ? "completed" : ""}`} onClick={() => open("ad-game")}>
            <span className="ad-label">CLASSIC ACTION RPG</span><div className="pixel-hero sprite-ad-hero" style={{ backgroundImage: `url(${adventureHeroSprites})` }} aria-hidden="true" /><span className="game-ad-copy"><strong>G의 전설</strong><span>초원 너머의 모험이 기다립니다</span></span><b>PLAY</b>
          </button>
        </div>
      </div>

      <footer className="portal-footer"><span>오늘</span><p>새로운 소식은 계속 도착합니다.</p><nav aria-label="포털 정보"><span>서비스 안내</span><span>개인정보</span><span>고객센터</span></nav></footer>
    </main>
  );
}

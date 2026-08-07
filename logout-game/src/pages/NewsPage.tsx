import { useGameState } from "../state/GameStateContext";
import wildfireImage from "../image/산불.png";
import extinguishedWildfireImage from "../image/산불_꺼진상태.png";
import invertedWildfireImage from "../image/산불_반전.png";

const relatedStories = [
  {
    tag: "사회",
    title: "취업 준비 길어지는 대한민국 청년들… 첫 경력 쌓기도 어렵다",
    excerpt: "경력을 요구하는 공고와 길어진 채용 절차 속에서 사회에 첫발을 내딛으려는 청년들의 대기 시간이 늘고 있다.",
  },
  {
    tag: "생활",
    title: "천천히 걷는 사람을 위한 횡단보도 실험",
    excerpt: "보행 속도에 따라 신호 시간이 달라지는 작은 실험이 도심 세 곳에서 시작됐다.",
  },
  {
    tag: "문화",
    title: "빈 페이지로 시작하는 작은 전시",
    excerpt: "완성된 작품 대신 시작을 기다리는 종이와 책상을 놓은 전시가 관람객을 맞는다.",
  },
];

export function NewsPage() {
  const { state, dispatch, notify } = useGameState();
  const canSeeLetter = state.news.fireExtinguished && state.browser.darkMode;
  const articleImage = !state.news.fireExtinguished
    ? wildfireImage
    : state.browser.darkMode
      ? invertedWildfireImage
      : extinguishedWildfireImage;

  function handleFirePhoto() {
    if (state.news.fireExtinguished) {
      return;
    }
    if (state.inventory.selectedItem === "water" && state.inventory.water === "owned") {
      dispatch({ type: "EXTINGUISH_FIRE" });
      notify("생수를 사용했습니다. 불꽃과 연기가 잦아들었습니다.");
      return;
    }
    notify(state.inventory.water === "owned" ? "사진 너머의 열기가 손끝에 남는다." : "불길과 연기 때문에 사진의 안쪽이 보이지 않는다.");
  }

  function collectO() {
    if (state.collectedLetters["news-o"]) return;
    dispatch({ type: "COLLECT_LETTER", clue: "news-o" });
    notify("문자 단서 O를 획득했습니다.");
  }

  return (
    <main className="news-page page-inner">
      <header className="site-header news-header"><div><span className="site-kicker">오늘을 기록합니다</span><h1>새벽일보</h1></div><div className="today-stamp">오늘 · 아침판</div></header>
      <nav className="news-nav" aria-label="뉴스 분야"><span>주요 뉴스</span><span>사회</span><span>기후</span><span>문화</span><span>기록</span></nav>
      <div className="news-layout">
        <article className="lead-story">
          <span className="eyebrow">기후 · 오늘</span>
          <h2>은빛 능선에 번진 불길, 길을 기다리는 숲</h2>
          <p className="lead">가상의 은빛숲 동쪽 능선에서 번진 불길이 아직 시야를 가리고 있습니다. 기록팀은 멀리서 상황을 지켜보고 있습니다.</p>
          <div
            className={`fire-photo ${state.news.fireExtinguished ? "extinguished" : "burning"} ${state.inventory.selectedItem === "water" ? "item-target" : ""}`}
            onClick={handleFirePhoto}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleFirePhoto(); }}
            role="button"
            tabIndex={0}
            aria-label={state.news.fireExtinguished ? "불이 꺼진 기사 사진" : "불길이 보이는 기사 사진"}
          >
            <img src={articleImage} alt="유감산 능선을 따라 번진 산불 현장" />
            {canSeeLetter && !state.collectedLetters["news-o"] && <button className="news-letter-o" onClick={(event) => { event.stopPropagation(); collectO(); }} aria-label="사진 속 알파벳 O">O</button>}
            <span className="photo-caption">유감산 현장 사진 · 오늘</span>
          </div>
          <div className="article-body"><p>유감산 능선을 따라 번진 불길로 인근 탐방로가 통제됐습니다. 진화 인력은 바람이 잦아드는 구간부터 남은 불씨를 확인하고 있으며, 현장 주변에는 짙은 연기가 머물고 있습니다.</p><p>관계 당국은 산림 가장자리의 열기가 완전히 식을 때까지 접근을 자제해 달라고 전했습니다. 새벽부터 이어진 진화 작업으로 큰 불길은 점차 낮아지고 있습니다.</p></div>
        </article>
        <aside className="related-news"><h2>이어지는 오늘</h2>{relatedStories.map((story) => <article key={story.title}><span>{story.tag}</span><h3>{story.title}</h3><p>{story.excerpt}</p><small>오늘 · 3분 전</small></article>)}</aside>
      </div>
    </main>
  );
}

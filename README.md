# 웹페이지 탈출 게임

가짜 웹 브라우저와 여러 웹페이지를 탐색하고, 브라우저 기능과 인벤토리를 활용해 탈출 방법을 찾아내는 퍼즐 게임입니다.

## 바로가기

- 🎮 **[게임 바로 플레이하기](https://mindarinda47.github.io/website-escape-game/)**
- 🤖 [AI 활용 기술 문서](website-escape-game/submission-docs/AI활용기술문서_이종민.pdf)
- 🧩 [완벽 공략집](website-escape-game/submission-docs/공략집.pdf) — 스포일러 포함

별도 설치 없이 데스크톱 Chrome 또는 Edge에서 플레이할 수 있습니다.

## 조작

- 웹 탐색: 마우스, 주소창, 페이지 내 찾기, 확대·축소, 화면 테마 등 게임 안의 브라우저 기능
- 인벤토리: 화면 아래 손잡이에 마우스를 올리거나 `I`
- 「G의 전설」: `WASD`/방향키 이동, `Space` 공격, `E` 상호작용, `P` 일시정지

## 개발 및 실행

프로젝트 소스는 [`website-escape-game`](website-escape-game) 폴더에 있습니다.

```bash
cd website-escape-game
pnpm install
pnpm dev
```

검증 명령은 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`입니다. `main` 브랜치에 반영된 코드는 GitHub Actions를 통해 GitHub Pages로 배포됩니다.

## 기술 및 에셋

React, TypeScript, Vite 기반으로 제작했습니다. AI 활용 내역, 외부 효과음 출처와 라이선스는 위의 AI 활용 기술 문서에 정리했습니다.

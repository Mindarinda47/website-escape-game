# 웹페이지 탈출 게임

가짜 웹 브라우저 안의 여러 페이지를 탐색하고, 브라우저 기능과 인벤토리를 활용해 탈출 방법을 찾아내는 퍼즐 게임입니다.

## 바로가기

- 🎮 **[게임 바로 플레이하기](https://mindarinda47.github.io/website-escape-game/)**
- 🤖 [AI 활용 기술 문서](submission-docs/AI활용기술문서_이종민.pdf)
- 🧩 [완벽 공략집](submission-docs/공략집.pdf) — 스포일러 포함

## 실행

Node.js 20.19 이상 또는 22.12 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

개발 서버가 안내하는 로컬 주소를 데스크톱 브라우저에서 엽니다. 기준 해상도는 1440×900, 최소 권장 폭은 1024px입니다.

## 조작

- 가짜 브라우저: 뒤로/앞으로, 새로고침, 홈, 주소 직접 입력, 다크 모드, 75~150% 확대, 페이지 내 찾기
- 찾기: `Ctrl/Cmd + F`, `Enter` 다음 결과, `Shift + Enter` 이전 결과, `Esc` 닫기
- 인벤토리: 마우스를 화면 아래 손잡이에 올리거나 `I`, 고정 버튼으로 열린 상태 유지
- 미니게임: `WASD`/방향키 이동, `Space` 공격, `E` 상호작용, `P` 일시정지

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

단위 테스트는 정답 정규화, reducer, 파생 완료 상태, 두 갈래의 순서 독립성, 저장값 복구를 다룹니다.

## 구조

- `src/state`: 버전이 있는 전역 상태, reducer, 저장/복구, 파생 selector
- `src/browser`: 가짜 브라우저 툴바, 주소창, 찾기, 인벤토리
- `src/pages`: 포털 및 네 콘텐츠 페이지
- `src/minigame`: Canvas 게임 런타임, 장면 정보, 충돌/이동 유틸리티
- `src/components`: 완료 모달과 접근 가능한 토스트
- `src/test`: 핵심 규칙 단위 테스트

AI 활용 내역과 외부 효과음 출처·라이선스는 위의 AI 활용 기술 문서에서 확인할 수 있습니다.

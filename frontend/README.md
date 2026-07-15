# Frontend

React + TypeScript + Vite 기반 프론트엔드입니다.

## 기술 스택

- React 19 / React Router 8 (`createBrowserRouter`)
- TanStack Query
- Vite 8, TypeScript (strict, `moduleResolution: bundler`)
- ESLint + Prettier
- Vitest + Testing Library

## 요구 사항

- Node.js `24.18.0` (`.nvmrc` 참고. nvm 사용 시 `nvm use`)
- npm `11.16.0` (`packageManager` 필드로 고정됨)

## 시작하기

```bash
npm install
cp .env.example .env   # 필요한 값으로 수정
npm run dev
```

## 환경 변수

`.env.example` 참고. 로컬 개발 시 `.env`를 만들어 채워 넣으세요.

| 변수                | 설명            |
| ------------------- | --------------- |
| `VITE_API_BASE_URL` | 백엔드 API 주소 |

## 스크립트

| 명령                   | 설명                            |
| ---------------------- | ------------------------------- |
| `npm run dev`          | 개발 서버 실행                  |
| `npm run build`        | 타입체크 후 프로덕션 빌드       |
| `npm run preview`      | 빌드 결과 로컬 미리보기         |
| `npm run typecheck`    | 타입 검사만 실행 (`tsc -b`)     |
| `npm run lint`         | ESLint 검사                     |
| `npm run format`       | Prettier로 전체 포맷팅          |
| `npm run format:check` | 포맷팅 여부만 검사 (수정 안 함) |
| `npm run test`         | Vitest 1회 실행                 |
| `npm run test:watch`   | Vitest watch 모드               |

PR 올리기 전에 `lint`, `typecheck`, `format:check`, `test`가 모두 통과하는지 확인해주세요.

## 디렉토리 구조

```
src/
  app/
    router/       # 라우터 설정 (router.tsx, 경로 상수 paths.ts)
    layouts/       # 라우트 공통 레이아웃 (RootLayout 등)
    providers/     # 전역 Provider (QueryClientProvider 등으로 App을 감싸는 것들)
    styles/        # 전역 스타일/디자인 토큰 (globals.css, tokens.css)
  pages/
    <PageName>/    # 라우트에 매핑되는 페이지. 여러 feature를 조합만 하고 로직은 최소화
  features/
    <featureName>/ # 특정 기능 단위(도메인) 모듈. 해당 기능의 컴포넌트/훅/api 등을 함께 둠
  shared/
    api/           # API 클라이언트 인스턴스, 공통 요청 함수
    components/    # 여러 곳에서 재사용하는 UI 컴포넌트
    constants/     # 공통 상수
    hooks/         # 공통 커스텀 훅
    lib/           # 범용 유틸 함수
    types/         # 공통 타입
  test/
    setup.ts       # Vitest 전역 설정 (jest-dom matcher 등록)
  main.tsx         # 엔트리포인트
  App.tsx          # RouterProvider 루트
```

- `pages` / `features` / `shared` / `app`으로 계층을 나눕니다. `shared`는 특정 기능에 종속되지 않는 것만, 특정 도메인 로직은 `features`에 둡니다.
- 새 페이지는 `src/pages/<PageName>/<PageName>.tsx`로 추가하고 `app/router/router.tsx`에 등록합니다.
- `features/`, `shared/*`, `app/providers`는 아직 비어 있는 초기 스캐폴딩입니다. 빈 폴더는 git이 추적하지 않으므로 각 폴더에 `.gitkeep`을 넣어뒀습니다 — 실제 파일을 추가하면 `.gitkeep`은 지워도 됩니다.
- import 시 `@/`는 `src/`를 가리키는 alias입니다 (`tsconfig.app.json`, `vite.config.ts` 양쪽에 등록되어 있으니, 새 tsconfig/vite 설정을 만질 때는 두 곳 다 같이 맞춰주세요).
- 테스트는 대상 파일 옆에 `*.test.tsx`로 둡니다. `describe/it/expect`는 각 테스트 파일에서 `vitest`로부터 명시적으로 import합니다 (globals 비활성 상태).

## 알아두면 좋은 것

- `tsconfig.json`은 `tsconfig.app.json`(브라우저 코드)과 `tsconfig.node.json`(vite.config.ts 등 node 코드)을 참조하는 solution 스타일 설정입니다. 컴파일러 옵션을 바꿀 땐 두 파일 중 어디에 해당하는지 확인하세요.

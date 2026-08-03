# Frontend

Expo 없이 React Native Community CLI로 구성한 iOS/Android 앱입니다.

## 기술 스택

- React 19 / React Native 0.86
- React Navigation (native-stack)
- TanStack Query
- react-native-dotenv (환경변수)
- ESLint + Prettier, Jest

## 요구 사항

- Node.js `24.18.0` (`.nvmrc` 참고. nvm 사용 시 `nvm use`)
- Android: Android Studio, Android SDK, 에뮬레이터 또는 USB 디바이스
- iOS: macOS, Xcode, CocoaPods

## 시작하기

```bash
npm install
cp .env.example .env   # 필요한 값으로 수정
npm start
```

다른 터미널에서 플랫폼을 실행합니다.

```bash
npm run android
# macOS에서만
npm run ios
```

iOS는 최초 한 번, 또는 네이티브 의존성을 변경한 뒤 다음을 실행합니다.

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## 환경 변수

`.env.example` 참고. 로컬 개발 시 `.env`를 만들어 채워 넣으세요. `babel.config.js`의
`react-native-dotenv` 플러그인이 빌드 시점에 값을 코드에 주입합니다.


## 에이전트 스킬

Codex와 Claude Code는 `agent-skills/`의 동일한 원본 스킬을 사용합니다. `.agents/skills/`와 `.claude/skills/`는 생성물이며 직접 편집하지 않습니다.

```bash
npm run agents:sync
npm run agents:check
```

- `npm run agents:sync`: `agent-skills/` 원본을 Codex용 `.agents/skills/`와 Claude Code용 `.claude/skills/`에 복사합니다. 스킬을 추가하거나 수정한 뒤 실행합니다.
- `npm run agents:check`: 두 생성본이 원본과 정확히 일치하는지 검사합니다. 누락, 직접 수정, 오래된 파일이 있으면 실패합니다.

권장 순서:

```bash
# agent-skills/에서 스킬을 수정한 뒤
npm run agents:sync
npm run agents:check
```

`agents:check`이 실패하면 생성본을 직접 고치지 말고 `npm run agents:sync`를 다시 실행합니다.
| 변수           | 설명            |
| -------------- | --------------- |
| `API_BASE_URL` | 백엔드 API 주소 |

```ts
import { API_BASE_URL } from "@env";
```

`.env` 값을 바꾼 뒤에는 Metro 캐시를 지우고 다시 시작해야 반영됩니다.

```bash
npm start -- --reset-cache
```

## 스크립트

| 명령                | 설명                     |
| ------------------- | ------------------------ |
| `npm start`         | Metro 번들러 실행        |
| `npm run android`   | 폰에 앱 빌드/실행        |
| `npm run android:reverse` | 폰의 8080 포트 역방향 연결 |
| `npm run ios`       | iOS 앱 빌드/실행 (macOS) |
| `npm run lint`      | ESLint 검사              |
| `npm run test`      | Jest 테스트 실행         |
| `npm run wear:install` | 워치에 워치 앱 빌드/설치 |
| `npm run wear:build`   | 갤럭시 워치 앱 빌드   |

PR 올리기 전에 `lint`, `test`가 통과하는지 확인해주세요.

### 폰과 워치를 같이 붙였을 때

`:app`과 `:wear`는 Data Layer 통신 때문에 `applicationId`가 둘 다 `com.wecandoit`
입니다. 그래서 대상을 지정하지 않고 설치하면 **반대쪽 앱이 덮여서 사라집니다.**

`android:*`와 `wear:install`은 붙어 있는 기기 중 **폰/워치를 가려내 한 대에만**
설치합니다. 판별은 워치 매니페스트가 요구하는 `android.hardware.type.watch`
feature를 봅니다. 대상을 정하지 못하면(0대이거나 2대 이상) 설치하지 않고 멈춥니다 —
잘못 덮는 것보다 실패가 낫기 때문입니다.

같은 종류가 여러 대 붙어 있거나 판별이 어긋날 때는 시리얼을 직접 넘깁니다.

```bash
npm run android:dev -- --serial R3CT30ABCDE
npm run wear:install -- --serial 192.168.0.31:41235
adb devices   # 시리얼 확인
```

워치는 절전으로 무선 디버깅이 자주 끊깁니다. 목록에서 사라지거나 `offline`이면
다시 붙입니다(개발자 옵션 → 무선 디버깅에서 포트가 바뀌었는지 확인).

```bash
adb disconnect <워치주소> && adb connect <워치주소>
```

## 디렉토리 구조

```
App.tsx                 # 앱 루트: Provider/Navigation 조립
index.js                # React Native 앱 등록 진입점
env.d.ts                # `@env` 모듈 타입 선언
android/                # Android Gradle 프로젝트
  app/                  # 폰 앱(React Native)
  wear/                 # 갤럭시 워치 컴패니언 (Kotlin + Compose). android/wear/README.md 참고
  wear-protocol/        # 폰·워치가 같이 컴파일하는 Data Layer 규약
ios/                    # iOS Xcode 프로젝트
__tests__/              # Jest 테스트
src/
  app/
    navigation/         # RootNavigator 등 네비게이션 설정
    providers/          # QueryClientProvider 등 전역 Provider
  screens/
    <ScreenName>/       # 라우트에 매핑되는 화면. 여러 feature를 조합만 하고 로직은 최소화
  features/
    <featureName>/      # 특정 기능 단위(도메인) 모듈. 해당 기능의 컴포넌트/훅/api 등을 함께 둠
  shared/
    api/                # API 클라이언트 (fetch 래퍼, `@env`로 baseURL 설정)
    components/         # 여러 화면에서 재사용하는 UI 컴포넌트
    constants/          # 공통 상수
    hooks/              # 공통 커스텀 훅
    lib/                # 범용 유틸 함수
    types/              # 공통 타입
```

- `screens` / `features` / `shared` / `app`으로 계층을 나눕니다. `shared`는 특정 기능에 종속되지 않는 것만, 특정 도메인 로직은 `features`에 둡니다.
- 새 화면은 `src/screens/<ScreenName>/<ScreenName>.tsx`로 추가하고 `src/app/navigation/RootNavigator.tsx`에 등록합니다.
- `features/`, `shared/*`는 아직 비어 있는 초기 스캐폴딩입니다. 빈 폴더는 git이 추적하지 않으므로 각 폴더에 `.gitkeep`을 넣어뒀습니다 — 실제 파일을 추가하면 `.gitkeep`은 지워도 됩니다.

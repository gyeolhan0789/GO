# Frontend

Expo 없이 React Native Community CLI로 구성한 iOS/Android 앱입니다.

## 요구 사항

- Node.js 22.11 이상 (현재 프로젝트는 Node 24 사용 가능)
- Android: Android Studio, Android SDK, 에뮬레이터 또는 USB 디바이스
- iOS: macOS, Xcode, CocoaPods

## 설치 및 실행

```bash
npm install
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

## 주요 구조

- `App.tsx`: 앱 루트 및 현재 Home 화면
- `index.js`: React Native 앱 등록 진입점
- `android/`: Android Gradle 프로젝트
- `ios/`: iOS Xcode 프로젝트
- `__tests__/`: Jest 테스트


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

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

기존 Vite 웹 애플리케이션은 프로젝트 루트의 `frontend-web-backup`에 보관되어 있습니다.

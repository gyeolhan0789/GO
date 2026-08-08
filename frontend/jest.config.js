const reactNativePreset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  // 프리셋의 setupFiles를 그대로 두고 뒤에 덧붙인다. 새 배열로 덮어쓰면
  // React Native 환경 초기화가 통째로 빠진다.
  setupFiles: [...reactNativePreset.setupFiles, '<rootDir>/jest/setupTimezone.js'],
  transformIgnorePatterns: [
    // react-native-chart-kit은 dist에 ESM + 트랜스파일 안 된 JSX를 그대로 담아
    // 배포한다. Metro는 알아서 변환하지만 Jest는 여기에 넣어줘야 파싱된다.
    // react-native-image-picker, react-native-maps도 마찬가지로 트랜스파일 안 된
    // TS 소스를 그대로 담아 배포한다.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-chart-kit|react-native-image-picker|react-native-maps)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|woff|woff2)$': '<rootDir>/jest/fileMock.js',
    // 대용량 배너 SVG 문자열 모듈은 테스트에서 가벼운 스텁으로 대체한다.
    'assets/SignupHero$': '<rootDir>/jest/svgStringMock.js',
    '^react-native-maps$': '<rootDir>/jest/reactNativeMapsMock.tsx',
    '^@react-native-firebase/messaging$': '<rootDir>/jest/firebaseMessagingMock.js',
  },
};

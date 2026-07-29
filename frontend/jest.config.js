module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    // react-native-chart-kit은 dist에 ESM + 트랜스파일 안 된 JSX를 그대로 담아
    // 배포한다. Metro는 알아서 변환하지만 Jest는 여기에 넣어줘야 파싱된다.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-chart-kit)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|woff|woff2)$': '<rootDir>/jest/fileMock.js',
    // 대용량 배경/배너 SVG 문자열 모듈은 테스트에서 가벼운 스텁으로 대체한다.
    'assets/OnboardingBg\\d+$': '<rootDir>/jest/svgStringMock.js',
    'assets/SignupHero$': '<rootDir>/jest/svgStringMock.js',
  },
};

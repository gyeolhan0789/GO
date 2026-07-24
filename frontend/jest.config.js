module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|woff|woff2)$': '<rootDir>/jest/fileMock.js',
    // 대용량 온보딩 배경 SVG 문자열 모듈은 테스트에서 가벼운 스텁으로 대체한다.
    'assets/OnboardingBg\\d+$': '<rootDir>/jest/svgStringMock.js',
  },
};

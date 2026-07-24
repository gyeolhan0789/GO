module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-vector-icons|@react-navigation|react-native-screens|react-native-safe-area-context)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|woff|woff2)$': '<rootDir>/jest/fileMock.js',
  },
};

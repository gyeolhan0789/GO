module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: false,
        // `.env`는 gitignore 대상이라 없을 수 있다. 소비하는 쪽에서 기본값으로 대체한다.
        allowUndefined: true,
      },
    ],
  ],
};

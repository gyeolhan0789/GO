// 테스트 환경에는 카카오 네이티브 모듈이 없으므로 자동 목으로 대체한다.
// (루트 __mocks__ 하위의 node_modules 목은 jest가 자동 적용한다.)
const kakaoLogin = {
  login: jest.fn(),
  loginWithKakaoAccount: jest.fn(),
  logout: jest.fn(),
  unlink: jest.fn(),
  getProfile: jest.fn(),
  getAccessToken: jest.fn(),
};

module.exports = kakaoLogin;
module.exports.default = kakaoLogin;

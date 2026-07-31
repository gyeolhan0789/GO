// 테스트 환경에는 Google 로그인 네이티브 모듈이 없으므로 자동 목으로 대체한다.
// (루트 __mocks__ 하위의 node_modules 목은 jest가 자동 적용한다.)
const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};

const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(() => Promise.resolve(true)),
  signIn: jest.fn(),
  signInSilently: jest.fn(),
  signOut: jest.fn(),
  revokeAccess: jest.fn(),
  getCurrentUser: jest.fn(() => null),
  getTokens: jest.fn(),
};

// 응답 판별 헬퍼는 실제 구현과 같은 규칙을 그대로 흉내낸다.
module.exports = {
  GoogleSignin,
  statusCodes,
  isSuccessResponse: response => response?.type === 'success',
  isCancelledResponse: response => response?.type === 'cancelled',
  isErrorWithCode: error => typeof error?.code === 'string',
};

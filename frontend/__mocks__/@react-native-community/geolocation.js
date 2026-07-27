// 테스트 환경에는 네이티브 위치 모듈이 없으므로 자동 목으로 대체한다.
// (루트 __mocks__ 하위의 node_modules 목은 jest가 자동 적용한다.)
const geolocation = {
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
};

module.exports = geolocation;
module.exports.default = geolocation;

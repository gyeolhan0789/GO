/**
 * `react-native-keychain`을 테스트에서 대체하기 위한 헬퍼. 네이티브 모듈이라
 * jest 환경에서는 그대로 부를 수 없다.
 *
 * 실제 Keychain의 계약을 그대로 흉내낸다 — 특히 저장된 값이 없을 때
 * `getGenericPassword`가 `null`이 아니라 `false`를 반환하는 부분.
 */

export type KeychainMock = {
  setGenericPassword: jest.Mock;
  getGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
  ACCESSIBLE: { AFTER_FIRST_UNLOCK: string };
};

/**
 * 메모리에 값을 들고 있는 가짜 Keychain.
 *
 * `jest.mock`의 factory는 외부 변수를 참조할 수 없으므로 factory 안에서
 * `require`로 부르고, 핸들은 `jest.requireMock`으로 받는다.
 *
 * ```ts
 * jest.mock('react-native-keychain', () =>
 *   require('../jest/keychainMock').createKeychainMock(),
 * );
 * const keychain: KeychainMock = jest.requireMock('react-native-keychain');
 * ```
 */
export function createKeychainMock(): KeychainMock {
  let stored: string | null = null;

  return {
    setGenericPassword: jest.fn(async (_account: string, password: string) => {
      stored = password;
      return true;
    }),
    getGenericPassword: jest.fn(async () =>
      stored === null ? false : { username: 'refreshToken', password: stored },
    ),
    resetGenericPassword: jest.fn(async () => {
      stored = null;
      return true;
    }),
    ACCESSIBLE: { AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock' },
  };
}

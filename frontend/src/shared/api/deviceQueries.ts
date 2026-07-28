import type { QueryKey } from '@tanstack/react-query';

/**
 * 계정이 아니라 이 기기에 속한 상태를 담는 쿼리들. AsyncStorage에 남는 값을
 * 비추는 캐시라, 로그아웃으로 계정 데이터를 비울 때도 함께 지우면 안 된다.
 *
 * 특히 진입 게이트(온보딩·권한)가 그렇다. 지우는 순간 RootNavigator가 읽는 값이
 * `undefined`가 되고, 그때 새 쿼리는 아직 fetch를 시작하지 않아 `isLoading`도
 * false다. 그 한 렌더 동안 게이트가 "미완료"로 읽혀, 로그아웃 직후 로그인 화면이
 * 아니라 온보딩부터 다시 시작한다.
 *
 * 새로 추가하는 쿼리는 기본이 "계정 데이터"다. 기기 단위 값이면 여기에 등록한다.
 */
export const ONBOARDING_QUERY_KEY = ['onboarding', 'completed'] as const;
export const PERMISSIONS_QUERY_KEY = ['permissions', 'completed'] as const;
export const PERMISSIONS_GRANTED_QUERY_KEY = [
  'permissions',
  'granted',
] as const;
export const LOGIN_HISTORY_QUERY_KEY = ['login', 'hasLoggedInBefore'] as const;

const DEVICE_QUERY_KEYS: readonly QueryKey[] = [
  ONBOARDING_QUERY_KEY,
  PERMISSIONS_QUERY_KEY,
  PERMISSIONS_GRANTED_QUERY_KEY,
  LOGIN_HISTORY_QUERY_KEY,
];

export function isDeviceQuery(queryKey: QueryKey): boolean {
  return DEVICE_QUERY_KEYS.some(
    deviceKey =>
      deviceKey.length === queryKey.length &&
      deviceKey.every((segment, index) => segment === queryKey[index]),
  );
}

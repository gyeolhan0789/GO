import type { QueryKey } from '@tanstack/react-query';

/**
 * 계정이 아니라 이 기기에 속한 상태를 담는 쿼리들. 로그아웃으로 계정 캐시를 비울
 * 때 함께 지우면 안 된다 — 진입 게이트(온보딩·권한)가 한 렌더 동안 미완료로 읽혀
 * 로그인 화면 대신 온보딩으로 간다.
 *
 * 새로 추가하는 쿼리는 기본이 계정 데이터다. 기기 단위 값이면 여기에 등록한다.
 */
export const ONBOARDING_QUERY_KEY = ['onboarding', 'completed'] as const;
export const PERMISSIONS_QUERY_KEY = ['permissions', 'completed'] as const;
export const PERMISSIONS_GRANTED_QUERY_KEY = [
  'permissions',
  'granted',
] as const;
export const LOGIN_HISTORY_QUERY_KEY = ['login', 'hasLoggedInBefore'] as const;
export const STEP_GOAL_TIER_QUERY_KEY = ['stepGoal', 'tier'] as const;
export const WALK_SESSION_GUIDE_QUERY_KEY = [
  'walkSession',
  'guideSeen',
] as const;

const DEVICE_QUERY_KEYS: readonly QueryKey[] = [
  ONBOARDING_QUERY_KEY,
  PERMISSIONS_QUERY_KEY,
  PERMISSIONS_GRANTED_QUERY_KEY,
  LOGIN_HISTORY_QUERY_KEY,
  STEP_GOAL_TIER_QUERY_KEY,
  WALK_SESSION_GUIDE_QUERY_KEY,
];

export function isDeviceQuery(queryKey: QueryKey): boolean {
  return DEVICE_QUERY_KEYS.some(
    deviceKey =>
      deviceKey.length === queryKey.length &&
      deviceKey.every((segment, index) => segment === queryKey[index]),
  );
}

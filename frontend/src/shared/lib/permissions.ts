import { Linking, PermissionsAndroid, Platform } from 'react-native';
import type { Permission } from 'react-native';

export type PermissionKey =
  | 'camera'
  | 'activityRecognition'
  | 'location'
  | 'notifications';

export type PermissionResult = 'granted' | 'denied' | 'blocked';

type PermissionSpec = {
  key: PermissionKey;
  androidPermission: Permission;
  // 이 API 레벨 미만에서는 런타임 권한이 없어 자동 허용으로 취급한다.
  minApiLevel?: number;
  // 없어도 서비스를 쓸 수 있는 권한. 요청은 하되 진입 게이트에서는 뺀다.
  optional?: boolean;
};

const PERMISSION_SPECS: readonly PermissionSpec[] = [
  { key: 'camera', androidPermission: PermissionsAndroid.PERMISSIONS.CAMERA },
  {
    key: 'activityRecognition',
    androidPermission: PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    minApiLevel: 29,
  },
  {
    key: 'location',
    androidPermission: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  },
  {
    key: 'notifications',
    androidPermission: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    minApiLevel: 33,
    optional: true,
  },
];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSION_SPECS.map(
  spec => spec.key,
);

/**
 * 없으면 서비스를 쓸 수 없는 권한.
 *
 * 알림은 빠진다 — 못 받아도 산책·미션·기록은 그대로 돌아가고, 거부했다고 앱 진입을
 * 막을 이유가 없다. 요청은 여전히 한다(PERMISSION_KEYS).
 */
export const REQUIRED_PERMISSION_KEYS: readonly PermissionKey[] =
  PERMISSION_SPECS.filter(spec => !spec.optional).map(spec => spec.key);

function androidApiLevel(): number {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10);
}

function isAutoGranted(spec: PermissionSpec): boolean {
  return spec.minApiLevel !== undefined && androidApiLevel() < spec.minApiLevel;
}

function mapStatus(status: string): PermissionResult {
  switch (status) {
    case PermissionsAndroid.RESULTS.GRANTED:
      return 'granted';
    case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
      return 'blocked';
    default:
      return 'denied';
  }
}

/**
 * 단일 권한을 런타임 요청한다. Android가 아니거나 해당 API 레벨에서 런타임
 * 권한이 필요 없으면 'granted'로 취급한다.
 */
export async function requestPermission(
  key: PermissionKey,
): Promise<PermissionResult> {
  const spec = PERMISSION_SPECS.find(item => item.key === key);
  if (!spec || Platform.OS !== 'android' || isAutoGranted(spec)) {
    return 'granted';
  }
  try {
    const status = await PermissionsAndroid.request(spec.androidPermission);
    return mapStatus(status);
  } catch {
    return 'denied';
  }
}

/**
 * 정의된 모든 권한을 순차적으로 요청하고 key별 결과를 반환한다.
 */
export async function requestAllPermissions(): Promise<
  Record<PermissionKey, PermissionResult>
> {
  const results = {} as Record<PermissionKey, PermissionResult>;
  for (const spec of PERMISSION_SPECS) {
    results[spec.key] = await requestPermission(spec.key);
  }
  return results;
}

/**
 * 현재 권한이 허용되어 있는지 확인한다(요청 없이 조회만).
 */
export async function checkPermission(key: PermissionKey): Promise<boolean> {
  const spec = PERMISSION_SPECS.find(item => item.key === key);
  if (!spec || Platform.OS !== 'android' || isAutoGranted(spec)) {
    return true;
  }
  try {
    return await PermissionsAndroid.check(spec.androidPermission);
  } catch {
    return false;
  }
}

/**
 * 필수 권한이 지금 전부 허용돼 있는지 확인한다(요청 없이 조회만).
 *
 * 진입 게이트용이다. 저장된 "완료" 플래그와 달리 설정에서 나중에 권한을 회수한
 * 경우까지 잡아낸다. 선택 권한(알림)은 보지 않는다 — 거부한 사용자가 앱을 열 때마다
 * 권한 화면으로 되돌아가면 안 된다.
 */
export async function areRequiredPermissionsGranted(): Promise<boolean> {
  const results = await Promise.all(
    REQUIRED_PERMISSION_KEYS.map(key => checkPermission(key)),
  );
  return results.every(Boolean);
}

/**
 * 앱 설정 화면을 연다(권한을 영구 거부한 경우 유도).
 */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

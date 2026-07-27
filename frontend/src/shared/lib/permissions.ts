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
  },
];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSION_SPECS.map(
  spec => spec.key,
);

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
 * 앱 설정 화면을 연다(권한을 영구 거부한 경우 유도).
 */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

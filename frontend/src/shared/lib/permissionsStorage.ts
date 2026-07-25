import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_COMPLETED_KEY = 'permissions.completed';

/**
 * 권한 요청 플로우를 한 번 완료했는지 읽는다. 실패 시 false(미완료)로 취급해
 * 다시 노출한다. (온보딩 [[onboardingStorage]]와 동일 패턴)
 */
export async function getPermissionsCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PERMISSIONS_COMPLETED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * 권한 요청 플로우 완료 상태를 저장한다.
 */
export async function setPermissionsCompleted(): Promise<void> {
  await AsyncStorage.setItem(PERMISSIONS_COMPLETED_KEY, 'true');
}

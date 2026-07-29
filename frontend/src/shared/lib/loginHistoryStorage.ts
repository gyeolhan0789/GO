import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOGIN_HISTORY_STORAGE_KEYS = {
  hasLoggedInBefore: 'login.hasLoggedInBefore',
} as const;

/**
 * 이 기기에서 한 번이라도 로그인에 성공한 적이 있는지 읽는다. 인사 문구를
 * 고르는 용도라 저장소 접근이 실패해도 앱이 멈추지 않도록 false(첫 로그인)로
 * 폴백한다.
 */
export async function getHasLoggedInBefore(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(
      LOGIN_HISTORY_STORAGE_KEYS.hasLoggedInBefore,
    );
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * 로그인 성공 이력을 저장한다.
 */
export async function setHasLoggedInBefore(): Promise<void> {
  await AsyncStorage.setItem(
    LOGIN_HISTORY_STORAGE_KEYS.hasLoggedInBefore,
    'true',
  );
}

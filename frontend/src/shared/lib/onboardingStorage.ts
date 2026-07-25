import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboardingCompleted: 'onboarding.completed',
} as const;

/**
 * 온보딩 완료 여부를 읽는다. 저장소 접근이 실패해도 앱이 멈추지 않도록
 * 실패 시 false(미완료)를 반환해 온보딩을 다시 노출한다.
 */
export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.onboardingCompleted);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * 온보딩 완료 상태를 저장한다.
 */
export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, 'true');
}

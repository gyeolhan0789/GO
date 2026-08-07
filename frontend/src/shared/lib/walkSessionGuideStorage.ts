import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  walkSessionGuideSeen: 'walkSession.guideSeen',
} as const;

/**
 * 산책 화면 첫 안내를 이미 봤는지 읽는다. 저장소 접근이 실패하면 온보딩과 같은
 * 기준으로 false(아직 못 봄)를 반환한다 — 안내를 한 번 더 보는 쪽이 처음 온
 * 사람이 빙고판을 못 찾는 쪽보다 낫다.
 */
export async function getWalkSessionGuideSeen(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(
      STORAGE_KEYS.walkSessionGuideSeen,
    );
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * 안내를 봤다고 저장한다.
 */
export async function setWalkSessionGuideSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.walkSessionGuideSeen, 'true');
}

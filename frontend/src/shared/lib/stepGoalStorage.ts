import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  stepGoalTier: 'stepGoal.tier',
} as const;

export type StepGoalTier = '5000' | '7000' | '10000';

const DEFAULT_TIER: StepGoalTier = '7000';
const VALID_TIERS: readonly StepGoalTier[] = ['5000', '7000', '10000'];

/**
 * 하루 목표 걸음수(입문자/일반/도전) 선택을 읽는다. 저장소 접근 실패나
 * 저장된 값이 유효하지 않을 때는 기본값(일반)으로 되돌린다.
 */
export async function getStepGoalTier(): Promise<StepGoalTier> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.stepGoalTier);
    return VALID_TIERS.includes(value as StepGoalTier)
      ? (value as StepGoalTier)
      : DEFAULT_TIER;
  } catch {
    return DEFAULT_TIER;
  }
}

/**
 * 하루 목표 걸음수 선택을 저장한다.
 */
export async function setStepGoalTier(tier: StepGoalTier): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.stepGoalTier, tier);
}

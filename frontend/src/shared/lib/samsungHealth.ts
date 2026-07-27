import { NativeModules, Platform } from 'react-native';

export type SamsungHealthSummary = {
  steps: number;
  distanceMeters: number;
  activeCalories: number;
};

type SamsungHealthNativeModule = {
  requestPermissions(): Promise<boolean>;
  hasPermissions(): Promise<boolean>;
  readToday(): Promise<SamsungHealthSummary>;
};

const native = NativeModules.SamsungHealth as
  | SamsungHealthNativeModule
  | undefined;

/** 네이티브 모듈(삼성헬스 SDK) 사용 가능 여부. Android + 모듈 로드 시 true. */
export function isSamsungHealthAvailable(): boolean {
  return Platform.OS === 'android' && native != null;
}

/** 삼성헬스 권한(걸음·활동요약 읽기)을 요청한다. */
export async function requestSamsungHealthPermissions(): Promise<boolean> {
  if (!native) {
    return false;
  }
  try {
    return await native.requestPermissions();
  } catch {
    return false;
  }
}

/** 삼성헬스 읽기 권한 보유 여부(요청 없이 조회). */
export async function hasSamsungHealthPermissions(): Promise<boolean> {
  if (!native) {
    return false;
  }
  try {
    return await native.hasPermissions();
  } catch {
    return false;
  }
}

/** 오늘의 걸음수/거리(m)/활동칼로리(kcal)를 삼성헬스에서 직접 읽는다. */
export async function readSamsungHealthToday(): Promise<SamsungHealthSummary | null> {
  if (!native) {
    return null;
  }
  try {
    return await native.readToday();
  } catch {
    return null;
  }
}

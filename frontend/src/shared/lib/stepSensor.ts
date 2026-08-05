import { NativeModules, Platform } from 'react-native';

import type { StepCounterReading } from './stepLedger';

type StepSensorNativeModule = {
  isAvailable(): Promise<boolean>;
  readRawCounter(): Promise<StepCounterReading>;
};

const native = NativeModules.StepSensor as StepSensorNativeModule | undefined;

/** 네이티브 모듈(기기 걸음 센서) 사용 가능 여부. Android + 모듈 로드 시 true. */
export function isStepSensorAvailable(): boolean {
  return Platform.OS === 'android' && native != null;
}

/**
 * 센서 원시값(재부팅 이후 누적)과 부팅 이후 경과시간. 센서가 없거나 읽기에 실패하면
 * null이다.
 *
 * 이 값을 그대로 화면에 쓰면 안 된다 — 날짜별 걸음으로 정리하는 건 걸음 원장의 몫이다
 * ([[stepLedger]]).
 */
export async function readStepCounter(): Promise<StepCounterReading | null> {
  if (!native) {
    return null;
  }
  try {
    if (!(await native.isAvailable())) {
      return null;
    }
    return await native.readRawCounter();
  } catch {
    return null;
  }
}

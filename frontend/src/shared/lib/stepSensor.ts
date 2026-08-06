import { NativeModules, Platform } from 'react-native';

import type { StepCounterReading } from './stepLedger';

type StepSensorNativeModule = {
  isAvailable(): Promise<boolean>;
  readRawCounter(): Promise<StepCounterReading>;
  startCounting(): Promise<void>;
  stopCounting(): Promise<void>;
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
/**
 * 걸음 집계 상주 서비스를 켠다.
 *
 * 삼성 센서허브의 만보기는 구독자가 붙어 있는 동안에만 돈다. 삼성헬스가 없는 기기는
 * 아무도 구독하지 않아 센서 누적치가 멈춰 있고, 그러면 readStepCounter가 몇 시간 전
 * 값을 계속 돌려준다 — 이 서비스가 떠 있어야 걸음이 실제로 쌓인다.
 *
 * 네이티브가 옛 버전이면 조용히 넘어간다. 걸음이 0으로 보일 뿐 앱이 죽을 일은 아니다.
 */
export async function startStepCounting(): Promise<void> {
  if (typeof native?.startCounting !== 'function') {
    return;
  }
  try {
    await native.startCounting();
  } catch {
    // 서비스 기동 실패(권한 회수 등). 다음 기회에 다시 시도된다.
  }
}

/** 걸음 집계 상주 서비스를 내린다(삼성헬스를 쓰게 된 기기). */
export async function stopStepCounting(): Promise<void> {
  if (typeof native?.stopCounting !== 'function') {
    return;
  }
  try {
    await native.stopCounting();
  } catch {
    // 이미 내려가 있으면 할 일이 없다.
  }
}

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

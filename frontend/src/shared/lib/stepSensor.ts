import { NativeModules, Platform } from 'react-native';

type StepSensorNativeModule = {
  isAvailable(): Promise<boolean>;
  readTodaySteps(): Promise<number>;
};

const native = NativeModules.StepSensor as StepSensorNativeModule | undefined;

/** 네이티브 모듈(기기 걸음 센서) 사용 가능 여부. Android + 모듈 로드 시 true. */
export function isStepSensorAvailable(): boolean {
  return Platform.OS === 'android' && native != null;
}

/** 오늘 누적 걸음수를 기기 자체 걸음 센서(TYPE_STEP_COUNTER)에서 직접 읽는다.
 * 삼성헬스 미동의/미지원 사용자를 위한 대체 경로다. */
export async function readStepSensorToday(): Promise<number | null> {
  if (!native) {
    return null;
  }
  try {
    if (!(await native.isAvailable())) {
      return null;
    }
    return await native.readTodaySteps();
  } catch {
    return null;
  }
}

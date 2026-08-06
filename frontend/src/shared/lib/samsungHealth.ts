import { NativeModules, Platform } from 'react-native';

export type SamsungHealthSummary = {
  steps: number;
  distanceMeters: number;
  activeCalories: number;
};

/** 기록이 없는 날은 아예 내려오지 않는다. 빠진 날은 호출부가 0으로 채운다. */
export type SamsungHealthDailySummary = SamsungHealthSummary & {
  /** 'yyyy-MM-dd'. */
  date: string;
};

/** 걸음이 없는 시간대는 내려오지 않는다. */
export type SamsungHealthHourlySteps = {
  /** 0~23. */
  hour: number;
  steps: number;
};

type SamsungHealthNativeModule = {
  isSupported(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  hasPermissions(): Promise<boolean>;
  readToday(): Promise<SamsungHealthSummary>;
  readDailySummaries(
    startDate: string,
    endDate: string,
  ): Promise<SamsungHealthDailySummary[]>;
  readHourlySteps(date: string): Promise<SamsungHealthHourlySteps[]>;
};

const native = NativeModules.SamsungHealth as
  | SamsungHealthNativeModule
  | undefined;

/** JS만 갱신하고 네이티브가 옛 버전이면 호출이 'is not a function'으로 터진다. */
export function isMissingNativeMethod(error: unknown): boolean {
  return (
    error instanceof TypeError && error.message.includes('is not a function')
  );
}

/**
 * 삼성헬스 데이터 경로를 쓸 수 있는 기기인지.
 *
 * 모듈 로드 여부로 판단하면 안 된다 — SamsungHealthPackage는 모든 안드로이드 빌드에
 * 항상 등록되므로 픽셀·LG에서도 모듈이 존재한다. 네이티브가 삼성헬스 앱 설치 여부를
 * 직접 보고 답한다.
 */
export async function isSamsungHealthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !native) {
    return false;
  }
  try {
    return await native.isSupported();
  } catch {
    return false;
  }
}

/**
 * 삼성헬스 읽기 권한 보유 여부(요청 없이 조회).
 *
 * 동의를 요청하는 경로는 없다. SDK가 파트너 등록 없이는 기기마다 삼성헬스 개발자
 * 모드를 켜야 동의를 받아주는데, 사용자에게 요구할 수 없는 일이라 권한 화면에서
 * 빼버렸다. 그래서 이 값은 예전에 동의해둔 사용자에게만 참이고, 나머지는 전부 기기
 * 걸음 센서로 간다([[useStepDataToday]]). 파트너 등록이 되면 요청을 되살리면 된다.
 */
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

/**
 * 기간(양쪽 포함)의 날짜별 걸음/거리/활동칼로리.
 *
 * 실패를 삼키지 않고 그대로 던진다. readToday처럼 null로 뭉개면 "네이티브 모듈이
 * 오래됐다", "권한이 빠졌다", "SDK가 거부했다"가 전부 같은 메시지로 보여서 원인을
 * 찾을 수 없다. 모듈 자체가 없을 때만 null이다.
 */
export async function readSamsungHealthDailySummaries(
  startDate: string,
  endDate: string,
): Promise<SamsungHealthDailySummary[] | null> {
  if (!native) {
    return null;
  }
  return native.readDailySummaries(startDate, endDate);
}

/** 하루의 시간대별 걸음. 실패는 그대로 던진다. 모듈이 없을 때만 null. */
export async function readSamsungHealthHourlySteps(
  date: string,
): Promise<SamsungHealthHourlySteps[] | null> {
  if (!native) {
    return null;
  }
  return native.readHourlySteps(date);
}

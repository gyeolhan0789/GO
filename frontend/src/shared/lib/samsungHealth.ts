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

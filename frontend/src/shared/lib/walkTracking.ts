import { NativeEventEmitter, NativeModules } from 'react-native';

import type { Gender } from '../../features/auth/constants/genders';

export type WalkTrackingStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

export type WalkSessionSnapshot = {
  sessionId: string | null;
  roomId: number | null;
  status: WalkTrackingStatus;
  startedAt: number | null;
  activeElapsedMs: number;
  steps: number;
  distanceMeters: number;
  calories: number;
  /** 앱을 최근 목록에서 스와이프해서, 이 산책이 그때까지 기록으로 자동
   * 종료돼야 한다는 뜻(WalkForegroundService.onTaskRemoved 참고). */
  pendingAutoComplete: boolean;
};

export type WalkTrackingCoords = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type WalkTrackingNativeModule = {
  startSession(roomId: number, gender: Gender | null): Promise<WalkSessionSnapshot>;
  pauseSession(): Promise<WalkSessionSnapshot>;
  resumeSession(): Promise<WalkSessionSnapshot>;
  stopSession(): Promise<WalkSessionSnapshot>;
  getSessionSnapshot(): Promise<WalkSessionSnapshot>;
  getRoute(): Promise<WalkTrackingCoords[]>;
};

const native = NativeModules.WalkTracking as WalkTrackingNativeModule | undefined;
const emitter = native ? new NativeEventEmitter(NativeModules.WalkTracking) : null;

const IDLE_SNAPSHOT: WalkSessionSnapshot = {
  sessionId: null,
  roomId: null,
  status: 'IDLE',
  startedAt: null,
  activeElapsedMs: 0,
  steps: 0,
  distanceMeters: 0,
  calories: 0,
  pendingAutoComplete: false,
};

export function isWalkTrackingAvailable(): boolean {
  return native != null;
}

export function startWalkTrackingSession(
  roomId: number,
  gender: Gender | null,
): Promise<WalkSessionSnapshot> {
  if (!native) {
    return Promise.resolve(IDLE_SNAPSHOT);
  }
  return native.startSession(roomId, gender);
}

export function pauseWalkTrackingSession(): Promise<WalkSessionSnapshot> {
  if (!native) {
    return Promise.resolve(IDLE_SNAPSHOT);
  }
  return native.pauseSession();
}

export function resumeWalkTrackingSession(): Promise<WalkSessionSnapshot> {
  if (!native) {
    return Promise.resolve(IDLE_SNAPSHOT);
  }
  return native.resumeSession();
}

export function stopWalkTrackingSession(): Promise<WalkSessionSnapshot> {
  if (!native) {
    return Promise.resolve(IDLE_SNAPSHOT);
  }
  return native.stopSession();
}

export function getWalkTrackingSnapshot(): Promise<WalkSessionSnapshot> {
  if (!native) {
    return Promise.resolve(IDLE_SNAPSHOT);
  }
  return native.getSessionSnapshot();
}

export function getWalkTrackingRoute(): Promise<WalkTrackingCoords[]> {
  if (!native) {
    return Promise.resolve([]);
  }
  return native.getRoute();
}

export function subscribeWalkTrackingState(
  listener: (snapshot: WalkSessionSnapshot) => void,
): () => void {
  const subscription = emitter?.addListener('WalkTrackingStateChanged', listener);
  return () => subscription?.remove();
}

export function subscribeWalkTrackingRoute(
  listener: (point: WalkTrackingCoords) => void,
): () => void {
  const subscription = emitter?.addListener(
    'WalkTrackingRouteAppended',
    (event: { point: WalkTrackingCoords }) => listener(event.point),
  );
  return () => subscription?.remove();
}

export function subscribeWalkTrackingOpenSession(listener: () => void): () => void {
  const subscription = emitter?.addListener('WalkTrackingOpenSession', listener);
  return () => subscription?.remove();
}

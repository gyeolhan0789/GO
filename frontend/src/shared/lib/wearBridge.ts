import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

/** 워치 홈 화면의 오늘 누적치. 폰 홈 화면이 보여주는 값과 같다. */
export type WearTodayStats = {
  steps: number;
  distanceMeters: number;
  calories: number;
  /** 0이면 목표가 없다는 뜻이라 워치가 진행률 링을 안 그린다. */
  goalSteps: number;
};

export type WearRoom = {
  roomId: number;
  name: string;
  /** RoomDetailResponse.mode와 같은 값. */
  mode: string;
  memberCount: number;
  completedMissionCount: number;
  totalMissionCount: number;
  /** false면 워치에서 못 고른다. 폰에서 먼저 처리해야 하는 방이다. */
  startable: boolean;
  blockedReason?: string;
};

export type WearSession = {
  roomId: number;
  roomName: string;
  /** 시작 카운트다운이 끝나 경과 시간이 실제로 세지고 있는지. */
  started: boolean;
  paused: boolean;
  /** 내림하지 않은 경과 밀리초. 워치가 이 값에서 자기 시계로 이어 센다. */
  elapsedMillis: number;
  steps: number;
  distanceMeters: number;
  calories: number;
};

export type WearState = {
  nickname: string;
  today: WearTodayStats;
  rooms: WearRoom[];
  /** 진행 중인 산책이 없으면 null. */
  session: WearSession | null;
};

export type WearCommandType =
  | 'start-walk'
  | 'end-walk'
  /** 일시정지와 재개가 같은 명령이다. 어느 쪽인지는 폰이 판단한다. */
  | 'toggle-pause'
  | 'request-sync';

export type WearCommand = {
  type: WearCommandType;
  /** start-walk에만 있다. */
  roomId?: number;
};

type WearBridgeNativeModule = {
  isWatchConnected(): Promise<boolean>;
  syncState(state: WearState): Promise<void>;
  syncCharacter(sources: string[]): Promise<void>;
  consumePendingCommands(): Promise<WearCommand[]>;
};

const COMMAND_EVENT = 'WearBridge:command';
const CONNECTION_EVENT = 'WearBridge:connectionChanged';

const native = NativeModules.WearBridge as WearBridgeNativeModule | undefined;

/** 네이티브 모듈 사용 가능 여부. Android + 모듈 로드 시 true. */
export function isWearBridgeAvailable(): boolean {
  return Platform.OS === 'android' && native != null;
}

/** 워치 앱이 깔린 기기가 지금 닿는지. 실패는 "없음"으로 본다. */
export async function isWatchConnected(): Promise<boolean> {
  if (!native) {
    return false;
  }
  try {
    return await native.isWatchConnected();
  } catch {
    return false;
  }
}

/**
 * 워치 화면이 필요한 상태 전부를 한 번에 보낸다.
 *
 * 실패를 삼킨다. 워치가 없거나 멀어진 상태가 정상 경로라서, 여기서 던지면
 * 폰 화면이 워치 때문에 깨진다.
 */
export async function syncWearState(state: WearState): Promise<void> {
  if (!native) {
    return;
  }
  try {
    await native.syncState(state);
  } catch {
    // 다음 동기화 때 자연히 재시도된다.
  }
}

/**
 * 캐릭터 레이어 이미지를 워치로 보낸다. 아래에 깔릴 것부터 순서대로 넘긴다
 * (기본 캐릭터 -> 하의 -> 상의 -> 모자). 네이티브가 한 장으로 합쳐 전송한다.
 */
export async function syncWearCharacter(sources: string[]): Promise<void> {
  if (!native || sources.length === 0) {
    return;
  }
  try {
    await native.syncCharacter(sources);
  } catch {
    // 캐릭터가 없어도 워치의 나머지 화면은 동작한다.
  }
}

/**
 * 워치가 보낸 명령을 가져가면서 큐를 비운다.
 *
 * 명령은 폰 앱이 꺼져 있어도 네이티브 큐에 쌓인다. 앱을 켤 때 한 번,
 * 그리고 [subscribeWearCommands] 신호를 받을 때마다 여기로 가져간다.
 */
export async function consumeWearCommands(): Promise<WearCommand[]> {
  if (!native) {
    return [];
  }
  try {
    return await native.consumePendingCommands();
  } catch {
    return [];
  }
}

/**
 * 워치가 뭔가 보냈다는 신호를 구독한다. 이벤트 자체에는 내용이 없고
 * ("큐를 확인하라"는 뜻), 실제 명령은 [consumeWearCommands]로 가져간다 —
 * 이벤트와 앱 시작 시점의 두 경로가 같은 큐를 보게 해서 중복 처리와 유실을
 * 동시에 막는다.
 */
export function subscribeWearCommands(listener: () => void): () => void {
  const subscription = DeviceEventEmitter.addListener(COMMAND_EVENT, listener);
  return () => subscription.remove();
}

/**
 * 워치 앱이 닿거나 끊길 때 알려준다(워치를 착용/해제하거나 앱을 설치·삭제).
 *
 * 앱이 떠 있는 동안 워치를 차는 경우가 이걸로 잡힌다 — 폴링으로는 앱을
 * 백그라운드에 보냈다 돌아올 때까지 알 수 없다.
 */
export function subscribeWatchConnection(
  listener: (connected: boolean) => void,
): () => void {
  const subscription = DeviceEventEmitter.addListener(
    CONNECTION_EVENT,
    (payload: string) => listener(payload === 'true'),
  );
  return () => subscription.remove();
}

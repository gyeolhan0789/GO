import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_WALK_SESSION_KEY = 'walkSession.active';

/**
 * 서버가 발급한 산책 세션 키를 기기에 붙들어 둔다.
 *
 * 진행 중인 산책의 소유자는 네이티브 WalkForegroundService라 앱이 죽어도 산책이
 * 이어지는데, 그 스냅샷에는 키를 담을 자리가 없다. JS 메모리에만 두면 앱이 다시
 * 뜬 뒤 종료할 때 키가 없어 산책이 기록으로 남지 못한다.
 *
 * roomId를 같이 저장하는 건 네이티브 세션과 짝이 맞는지 확인하기 위해서다.
 * 서버는 활성 세션이 이미 있으면 요청한 방을 보지 않고 그걸 돌려주기 때문에,
 * 지금 걷고 있는 방과 다른 세션의 키를 들고 있을 수 있다. 그 키로 종료하면
 * 엉뚱한 방의 기록이 되므로, 읽는 쪽이 항상 roomId를 대조해야 한다.
 */
export type ActiveWalkSessionRecord = {
  walkSessionKey: string;
  roomId: number;
  /** ISO-8601. 이 시각이 지나면 서버가 종료 요청을 받지 않는다(24시간). */
  expiresAt: string;
  /** 서버가 세션을 연 시각(ISO-8601). 종료 요청에 그대로 실어 보낸다. */
  startedAt?: string;
  /** 이 산책이 시작한 빙고판. 판을 못 읽고 시작했으면 없다. */
  bingoBoardId?: number | null;
};

function isRecord(value: unknown): value is ActiveWalkSessionRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ActiveWalkSessionRecord>;
  return (
    typeof candidate.walkSessionKey === 'string' &&
    typeof candidate.roomId === 'number' &&
    typeof candidate.expiresAt === 'string'
  );
}

/** 못 읽거나 깨진 값이면 없는 것으로 친다 — 엉뚱한 키로 종료를 시도하느니 낫다. */
export async function readActiveWalkSession(): Promise<ActiveWalkSessionRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_WALK_SESSION_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeActiveWalkSession(
  record: ActiveWalkSessionRecord,
): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_WALK_SESSION_KEY, JSON.stringify(record));
}

export async function clearActiveWalkSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_WALK_SESSION_KEY);
}

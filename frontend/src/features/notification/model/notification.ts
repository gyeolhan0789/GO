export const NOTIFICATION_TYPES = [
  'FRIEND_INVITE',
  'FRIEND_REQUEST',
  'WALK_START',
  'BATTLE_RESULT',
  'WEEKLY_BINGO_RENEWAL',
  'REWARD_EARNED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  targetId: number | null;
  read: boolean;
  createdAt: string;
};

export type NotificationData = Readonly<
  Record<string, unknown>
>;

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === 'string' &&
    NOTIFICATION_TYPES.some(type => type === value)
  );
}

export function parseNotificationTargetId(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const targetId = Number(value);
  return Number.isSafeInteger(targetId) && targetId > 0 ? targetId : null;
}

/** 백엔드 LocalDateTime 문자열을 기기 현지 시각 기준의 짧은 라벨로 바꾼다. */
export function formatNotificationTime(
  createdAt: string,
  now: Date = new Date(),
): string {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return '';
  }

  const diffMilliseconds = Math.max(0, now.getTime() - created.getTime());
  const diffMinutes = Math.floor(diffMilliseconds / 60_000);

  if (diffMinutes < 1) {
    return '방금 전';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  if (created.getFullYear() === now.getFullYear()) {
    return `${created.getMonth() + 1}월 ${created.getDate()}일`;
  }

  return `${created.getFullYear()}.${created.getMonth() + 1}.${created.getDate()}`;
}

import { navigationRef } from '../../../app/navigation/navigationRef';
import type { NotificationData, NotificationType } from './notification';
import {
  isNotificationType,
  parseNotificationTargetId,
} from './notification';

export type NotificationDestination =
  | { name: 'Notifications' }
  | { name: 'FriendRequests' }
  | { name: 'RoomInvites' }
  | { name: 'WalkRoomDetail'; params: { roomId: number } }
  | { name: 'BingoBoard'; params: { roomId: number } };

export function resolveNotificationDestination(
  type: NotificationType | undefined,
  targetId: number | null,
): NotificationDestination {
  switch (type) {
    case 'FRIEND_REQUEST':
      return { name: 'FriendRequests' };
    case 'FRIEND_INVITE':
      return { name: 'RoomInvites' };
    case 'WEEKLY_BINGO_RENEWAL':
      return targetId === null
        ? { name: 'Notifications' }
        : { name: 'BingoBoard', params: { roomId: targetId } };
    case 'WALK_START':
    case 'BATTLE_RESULT':
    case 'REWARD_EARNED':
      return targetId === null
        ? { name: 'Notifications' }
        : { name: 'WalkRoomDetail', params: { roomId: targetId } };
    default:
      return { name: 'Notifications' };
  }
}

export function resolveNotificationDataDestination(
  data: NotificationData | undefined,
): NotificationDestination {
  const type = isNotificationType(data?.type) ? data.type : undefined;
  return resolveNotificationDestination(
    type,
    parseNotificationTargetId(data?.targetId),
  );
}

let pendingDestination: NotificationDestination | null = null;

function navigate(destination: NotificationDestination): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }

  const rootState = navigationRef.getRootState();
  if (!rootState.routeNames.includes(destination.name)) {
    return false;
  }

  switch (destination.name) {
    case 'WalkRoomDetail':
      navigationRef.navigate(destination.name, destination.params);
      break;
    case 'BingoBoard':
      navigationRef.navigate(destination.name, destination.params);
      break;
    default:
      navigationRef.navigate(destination.name);
  }

  return true;
}

export function navigateFromNotification(
  type: NotificationType | undefined,
  targetId: number | null,
) {
  const destination = resolveNotificationDestination(type, targetId);
  pendingDestination = navigate(destination) ? null : destination;
}

export function navigateFromNotificationData(data: NotificationData | undefined) {
  const destination = resolveNotificationDataDestination(data);
  pendingDestination = navigate(destination) ? null : destination;
}

/** 네비게이터나 인증 스택이 준비되기 전에 탭한 콜드스타트 알림을 이어서 연다. */
export function flushPendingNotificationNavigation() {
  if (pendingDestination !== null && navigate(pendingDestination)) {
    pendingDestination = null;
  }
}

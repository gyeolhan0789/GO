import { apiClient } from '../../../shared/api/client';
import type { NotificationItem } from '../model/notification';

export type NotificationSlice = {
  content: NotificationItem[];
  hasNext: boolean;
};

export type GetNotificationsParams = {
  page?: number;
  size?: number;
};

export function getNotifications({
  page = 0,
  size = 20,
}: GetNotificationsParams = {}) {
  return apiClient.get<NotificationSlice>(
    `/notifications?page=${page}&size=${size}`,
  );
}

export function markNotificationAsRead(notificationId: number) {
  return apiClient.patch<void>(`/notifications/${notificationId}/read`);
}

export function updateMyFcmToken(fcmToken: string) {
  return apiClient.patch<void>('/members/me/fcm-token', { fcmToken });
}

import { apiClient } from '../../../shared/api/client';

export function updateMyFcmToken(fcmToken: string) {
  return apiClient.patch<void>('/members/me/fcm-token', { fcmToken });
}

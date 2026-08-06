import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  markNotificationAsRead,
  type NotificationSlice,
} from '../api/notificationApi';
import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

type NotificationsData = InfiniteData<NotificationSlice, number>;

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_data, notificationId) => {
      queryClient.setQueryData<NotificationsData>(
        NOTIFICATIONS_QUERY_KEY,
        current =>
          current === undefined
            ? current
            : {
                ...current,
                pages: current.pages.map(page => ({
                  ...page,
                  content: page.content.map(notification =>
                    notification.id === notificationId
                      ? { ...notification, read: true }
                      : notification,
                  ),
                })),
              },
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

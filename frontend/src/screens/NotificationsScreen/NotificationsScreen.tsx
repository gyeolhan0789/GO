import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { useMarkNotificationReadMutation } from '../../features/notification/hooks/useMarkNotificationReadMutation';
import { useNotificationsQuery } from '../../features/notification/hooks/useNotificationsQuery';
import type {
  NotificationItem,
  NotificationType,
} from '../../features/notification/model/notification';
import { formatNotificationTime } from '../../features/notification/model/notification';
import { navigateFromNotification } from '../../features/notification/model/notificationNavigation';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';

const END_REACHED_THRESHOLD = 0.5;
const SCREEN_EDGES = ['bottom'] as const;

const NOTIFICATION_ICONS: Record<NotificationType, IoniconsIconName> = {
  FRIEND_INVITE: 'mail-unread-outline',
  FRIEND_REQUEST: 'person-add-outline',
  WALK_START: 'walk-outline',
  BATTLE_RESULT: 'trophy-outline',
  WEEKLY_BINGO_RENEWAL: 'grid-outline',
  REWARD_EARNED: 'gift-outline',
};

type NotificationRowProps = {
  notification: NotificationItem;
  onPress: () => void;
};

function NotificationRow({ notification, onPress }: NotificationRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        !notification.read && styles.notificationUnread,
        pressed && styles.notificationPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${
        notification.read ? '읽음' : '읽지 않음'
      }`}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={NOTIFICATION_ICONS[notification.type]}
          size={22}
          color={colors.primaryDark}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <AppText numberOfLines={1} style={styles.notificationTitle}>
            {notification.title}
          </AppText>
          {!notification.read ? (
            <View style={styles.unreadDot} accessibilityLabel="읽지 않음" />
          ) : null}
        </View>
        <AppText style={styles.notificationBody}>{notification.body}</AppText>
        <AppText style={styles.notificationTime}>
          {formatNotificationTime(notification.createdAt)}
        </AppText>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.mutedStrong} />
    </Pressable>
  );
}

export function NotificationsScreen() {
  const notificationsQuery = useNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const notifications = useMemo(
    () =>
      notificationsQuery.data?.pages.flatMap(page => page.content) ?? [],
    [notificationsQuery.data],
  );

  const loadNextPage = () => {
    if (
      notificationsQuery.hasNextPage &&
      !notificationsQuery.isFetchingNextPage
    ) {
      notificationsQuery.fetchNextPage();
    }
  };

  const openNotification = (notification: NotificationItem) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    navigateFromNotification(notification.type, notification.targetId);
  };

  if (notificationsQuery.isLoading) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} />
          <AppText style={styles.stateText}>알림을 불러오는 중...</AppText>
        </View>
      </Screen>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <View style={styles.centeredState}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedStrong} />
          <AppText style={styles.stateTitle}>알림을 불러오지 못했어요</AppText>
          <Pressable
            onPress={() => notificationsQuery.refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.notificationPressed,
            ]}
            accessibilityRole="button"
          >
            <AppText style={styles.retryButtonText}>다시 시도</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={SCREEN_EDGES}>
      <FlatList
        data={notifications}
        keyExtractor={notification => String(notification.id)}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={() => openNotification(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        onEndReached={loadNextPage}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        refreshing={
          notificationsQuery.isRefetching &&
          !notificationsQuery.isFetchingNextPage
        }
        onRefresh={() => notificationsQuery.refetch()}
        ListEmptyComponent={
          <View style={styles.centeredState}>
            <Ionicons
              name="notifications-outline"
              size={40}
              color={colors.mutedStrong}
            />
            <AppText style={styles.stateTitle}>아직 도착한 알림이 없어요</AppText>
            <AppText style={styles.stateText}>
              친구 요청과 산책 소식을 여기에서 확인할 수 있어요.
            </AppText>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {notificationsQuery.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notification: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  notificationUnread: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.successBg,
  },
  notificationPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.highlightSoftBg,
  },
  notificationContent: {
    flex: 1,
    gap: spacing.xs,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationTitle: {
    flex: 1,
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  notificationBody: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
  },
  notificationTime: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.mutedStrong,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateTitle: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.inkMuted,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 112,
    minHeight: 44,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDark,
  },
  retryButtonText: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.surface,
  },
  footer: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

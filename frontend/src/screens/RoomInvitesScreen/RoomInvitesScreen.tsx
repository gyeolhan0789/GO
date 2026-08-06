import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { ReceivedRoomInvite } from '../../features/room/api/roomApi';
import { useAcceptRoomInviteMutation } from '../../features/room/hooks/useAcceptRoomInviteMutation';
import { useReceivedRoomInvitesQuery } from '../../features/room/hooks/useReceivedRoomInvitesQuery';
import { useRejectRoomInviteMutation } from '../../features/room/hooks/useRejectRoomInviteMutation';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { lineHeights } from '../../shared/constants/typography';
import { ReceivedRoomInviteRow } from './components/ReceivedRoomInviteRow';

const SCREEN_EDGES = ['bottom'] as const;

/** 받은 산책방 초대 내역. 친구 요청 화면(FriendRequestsScreen)과 같은 구조다. */
export function RoomInvitesScreen() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(
    null,
  );

  const receivedInvitesQuery = useReceivedRoomInvitesQuery();
  const receivedInvites = receivedInvitesQuery.data ?? [];
  const acceptInviteMutation = useAcceptRoomInviteMutation();
  const rejectInviteMutation = useRejectRoomInviteMutation();

  const handleAccept = (invite: ReceivedRoomInvite) => {
    setPendingRequestId(invite.requestId);
    acceptInviteMutation.mutate(
      { roomId: invite.roomId, requestId: invite.requestId },
      {
        onSuccess: () => setToastMessage('산책방 초대를 수락했어요.'),
        onError: error => {
          Alert.alert(
            '초대 수락 실패',
            error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
          );
          receivedInvitesQuery.refetch();
        },
        onSettled: () => setPendingRequestId(null),
      },
    );
  };

  const handleReject = (invite: ReceivedRoomInvite) => {
    Alert.alert(
      '산책방 초대 거절',
      `${invite.inviterNickname}님의 산책방 초대를 거절할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: () => {
            setPendingRequestId(invite.requestId);
            rejectInviteMutation.mutate(
              { roomId: invite.roomId, requestId: invite.requestId },
              {
                onSuccess: () => setToastMessage('산책방 초대를 거절했어요.'),
                onError: error => {
                  Alert.alert(
                    '초대 거절 실패',
                    error instanceof Error
                      ? error.message
                      : '잠시 후 다시 시도해주세요.',
                  );
                  receivedInvitesQuery.refetch();
                },
                onSettled: () => setPendingRequestId(null),
              },
            );
          },
        },
      ],
    );
  };

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        {receivedInvitesQuery.isLoading ? (
          <AppText style={styles.statusText}>불러오는 중...</AppText>
        ) : receivedInvitesQuery.isError ? (
          <Pressable
            onPress={() => receivedInvitesQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="받은 초대 다시 불러오기"
          >
            <AppText style={styles.statusText}>
              받은 산책방 초대를 불러오지 못했어요.{'\n'}눌러서 다시 시도
            </AppText>
          </Pressable>
        ) : (
          <FlatList
            data={receivedInvites}
            keyExtractor={invite => String(invite.requestId)}
            renderItem={({ item }) => (
              <ReceivedRoomInviteRow
                invite={item}
                onAccept={() => handleAccept(item)}
                onReject={() => handleReject(item)}
                disabled={pendingRequestId === item.requestId}
              />
            )}
            ListEmptyComponent={
              <AppText style={styles.statusText}>
                받은 산책방 초대가 없어요.
              </AppText>
            }
            refreshing={receivedInvitesQuery.isRefetching}
            onRefresh={() => receivedInvitesQuery.refetch()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  statusText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

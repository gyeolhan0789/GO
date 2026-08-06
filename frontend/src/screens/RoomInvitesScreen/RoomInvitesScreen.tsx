import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { ReceivedRoomInvite } from '../../features/room/api/roomApi';
import { useReceivedRoomInvitesQuery } from '../../features/room/hooks/useReceivedRoomInvitesQuery';
import { useRejectRoomInviteMutation } from '../../features/room/hooks/useRejectRoomInviteMutation';
import { useRoomInviteAccept } from '../../features/room/hooks/useRoomInviteAccept';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { lineHeights } from '../../shared/constants/typography';
import { ReceivedRoomInviteRow } from './components/ReceivedRoomInviteRow';

const SCREEN_EDGES = ['bottom'] as const;

type RoomInvitesNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'RoomInvites'
>;

/** 받은 산책방 초대 내역. 친구 요청 화면(FriendRequestsScreen)과 같은 구조다. */
export function RoomInvitesScreen() {
  const navigation = useNavigation<RoomInvitesNavigation>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(
    null,
  );

  const receivedInvitesQuery = useReceivedRoomInvitesQuery();
  const receivedInvites = receivedInvitesQuery.data ?? [];
  const rejectInviteMutation = useRejectRoomInviteMutation();

  // 대결 초대는 수락하는 순간 서버가 카운트다운을 쏜다. 구독을 먼저 붙여두지
  // 않으면 그 이벤트를 놓쳐서 대결이 시작된 걸 모른 채 남는다.
  //
  // 초대 응답에 mode가 없어서(백엔드에 추가 요청 중) 대결 초대만 골라낼 수
  // 없다. 그래서 어떤 초대든 대기 중이면 큐를 열어둔다 — 협동뿐이면 이벤트가
  // 안 올 뿐이고, 안 열어두면 대결 수락이 방에 못 들어간다.
  const hasPendingInvite = receivedInvites.some(
    invite => invite.status === 'PENDING',
  );
  const { acceptInvite } = useRoomInviteAccept({
    enabled: hasPendingInvite,
    onBattleStarted: event => {
      // 대결만 방으로 보낸다. 빙고판으로 직행하지 않고 대기방에서 상대와 같은
      // 카운트다운을 보고 함께 들어간다. 협동 초대는 이 이벤트가 오지 않아
      // 이 화면에 그대로 머문다.
      navigation.navigate('WalkRoomDetail', {
        roomId: event.roomId,
        battleCountdownSeconds: event.countdownSeconds ?? undefined,
      });
    },
    onInviteCancelled: () => {
      // 방장이 거둔 초대가 목록에 남아 있으면 눌러도 실패한다.
      setToastMessage('상대가 대결 신청을 취소했어요.');
      receivedInvitesQuery.refetch();
    },
  });

  const handleAccept = async (invite: ReceivedRoomInvite) => {
    setPendingRequestId(invite.requestId);
    try {
      await acceptInvite(invite);
      setToastMessage('산책방 초대를 수락했어요.');
    } catch (error) {
      Alert.alert(
        '초대 수락 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
      receivedInvitesQuery.refetch();
    } finally {
      setPendingRequestId(null);
    }
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

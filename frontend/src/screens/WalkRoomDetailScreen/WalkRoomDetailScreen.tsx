import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import {
  BattleResultModal,
  type BattleResult,
} from '../../features/bingo/components/BattleResultModal/BattleResultModal';
import { useActiveBingoBoardQuery } from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import { useMyMemberIdQuery } from '../../features/member/hooks/useMyMemberIdQuery';
import type { SentRoomInvite } from '../../features/room/api/roomApi';
import { useCancelRoomInviteMutation } from '../../features/room/hooks/useCancelRoomInviteMutation';
import { useDeleteRoomMutation } from '../../features/room/hooks/useDeleteRoomMutation';
import { useLeaveRoomMutation } from '../../features/room/hooks/useLeaveRoomMutation';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { useRoomPresenceSubscription } from '../../features/room/hooks/useRoomPresenceSubscription';
import { useSentRoomInvitesQuery } from '../../features/room/hooks/useSentRoomInvitesQuery';
import { ApiError } from '../../shared/api/ApiError';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { BattleWaitingRoom } from './components/BattleWaitingRoom';
import { RoomBingoCard } from './components/RoomBingoCard';
import { RoomMemberList } from './components/RoomMemberList';
import { RoomSummaryCard } from './components/RoomSummaryCard';

type WalkRoomDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkRoomDetail'
>;

export function WalkRoomDetailScreen({
  route,
  navigation,
}: WalkRoomDetailScreenProps) {
  const { roomId } = route.params;

  const roomQuery = useRoomDetailQuery(roomId);
  const room = roomQuery.data;
  const myMemberIdQuery = useMyMemberIdQuery();
  const myMemberId = myMemberIdQuery.data ?? null;
  const boardQuery = useActiveBingoBoardQuery(roomId);
  const isHost =
    room !== undefined && myMemberId !== null && room.hostId === myMemberId;
  const isBattleRoom = room?.mode === 'BATTLE';

  // 접속 여부는 대결 대기방만 쓴다 — 상대가 방에 들어왔는지가 대결 진행의 정보라서다.
  // 같이하기 방은 접속 표시를 하지 않으니 구독하지 않는다. 구독 자체가 입장이고
  // 해지가 퇴장이라, 쓰지 않을 화면에서 붙는 것만으로 서버에 접속으로 잡힌다.
  //
  // 방 멤버가 아니면 서버가 구독을 거절하는데, 그 ERROR 프레임을 우리 클라이언트가
  // 토큰 문제로 읽어 소켓을 통째로 재연결 루프에 빠뜨린다. 그래서 방 상세로 내가
  // 멤버임을 확인한 뒤에만 켠다.
  const isRoomMember =
    myMemberId !== null &&
    (room?.members ?? []).some(member => member.memberId === myMemberId);
  const { onlineMembers } = useRoomPresenceSubscription({
    roomId,
    enabled: isRoomMember && isBattleRoom,
  });
  // 초대 대기 목록은 방장의 관심사라 방장에게만 조회해서 보여준다.
  // 팀원은 누가 초대됐는지 알 필요가 없다.
  const sentInvitesQuery = useSentRoomInvitesQuery(isHost);

  const leaveMutation = useLeaveRoomMutation();
  const deleteMutation = useDeleteRoomMutation();
  const cancelInviteMutation = useCancelRoomInviteMutation();
  const [cancelingRequestId, setCancelingRequestId] = useState<number | null>(
    null,
  );
  // 대기방에서 기권했을 때의 결과·보상 모달. null이면 닫힘.
  const [forfeitResult, setForfeitResult] =
    useState<BattleResult | null>(null);

  // 네비게이터 제목은 '모임 상세'로 고정돼 있다. 대결은 이 화면이 대기방으로
  // 통째로 바뀌므로 제목도 그에 맞춘다.
  useEffect(() => {
    navigation.setOptions({
      title: isBattleRoom ? '대결 대기방' : '모임 상세',
    });
  }, [navigation, isBattleRoom]);

  // 서버는 내가 보낸 초대 전체를 주므로 이 방 것만 남긴다.
  const pendingInvites = isHost
    ? sentInvitesQuery.data?.filter(
        invite => invite.roomId === roomId && invite.status === 'PENDING',
      ) ?? []
    : [];

  const handleLeave = () => {
    Alert.alert('모임 나가기', '이 모임에서 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          leaveMutation.mutate(roomId, {
            onSuccess: () => navigation.goBack(),
            onError: error => {
              Alert.alert(
                '모임 나가기 실패',
                error instanceof Error
                  ? error.message
                  : '잠시 후 다시 시도해주세요.',
              );
            },
          });
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      '모임 삭제',
      '모임을 삭제하면 다른 친구들도 더 이상 참여할 수 없어요. 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(roomId, {
              onSuccess: () => navigation.goBack(),
              onError: error => {
                Alert.alert(
                  '모임 삭제 실패',
                  error instanceof Error
                    ? error.message
                    : '잠시 후 다시 시도해주세요.',
                );
              },
            });
          },
        },
      ],
    );
  };

  const handleCancelInvite = (invite: SentRoomInvite) => {
    Alert.alert(
      '초대 취소',
      `${invite.inviteeNickname}님에게 보낸 초대를 취소할까요?`,
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '초대 취소',
          style: 'destructive',
          onPress: () => {
            setCancelingRequestId(invite.requestId);
            cancelInviteMutation.mutate(
              { roomId, requestId: invite.requestId },
              {
                onError: error => {
                  Alert.alert(
                    '초대 취소 실패',
                    error instanceof Error
                      ? error.message
                      : '잠시 후 다시 시도해주세요.',
                  );
                  // 이미 수락/거절된 초대였을 수 있으니 목록을 최신으로 맞춘다.
                  sentInvitesQuery.refetch();
                },
                onSettled: () => setCancelingRequestId(null),
              },
            );
          },
        },
      ],
    );
  };

  if (roomQuery.isLoading) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <AppText style={styles.statusText}>불러오는 중...</AppText>
      </Screen>
    );
  }

  if (roomQuery.isError || !room) {
    return (
      <Screen edges={SCREEN_EDGES}>
        <Pressable onPress={() => roomQuery.refetch()}>
          <AppText style={styles.statusText}>
            모임 정보를 불러오지 못했어요.{'\n'}눌러서 다시 시도
          </AppText>
        </Pressable>
      </Screen>
    );
  }

  // 대결은 상대가 수락해야 서버가 게임을 만든다. 그 전에는 빙고판이 없어서
  // 산책방 화면을 그려봐야 빈 카드뿐이라, 대기방을 대신 보여준다.
  if (room.mode === 'BATTLE' && room.status !== 'CLOSED') {
    return (
      <Screen edges={SCREEN_EDGES}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <BattleWaitingRoom
            room={room}
            myMemberId={myMemberId}
            onlineMembers={onlineMembers}
            isHost={isHost}
            initialCountdownSeconds={route.params.battleCountdownSeconds}
            isBoardReady={boardQuery.data !== undefined}
            onCancelBattle={() => {
              Alert.alert(
                '대결 취소',
                '보낸 초대를 거두고 대결방을 없앨까요?',
                [
                  { text: '아니요', style: 'cancel' },
                  {
                    text: '대결 취소',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // 초대를 먼저 거둬야 상대에게 취소 이벤트가 간다 —
                        // 방만 지우면 상대의 초대가 닫힌 방을 가리킨 채 남는다.
                        const pending = pendingInvites[0];
                        if (pending) {
                          await cancelInviteMutation.mutateAsync({
                            roomId,
                            requestId: pending.requestId,
                          });
                        }
                        await deleteMutation.mutateAsync(roomId);
                        navigation.goBack();
                      } catch (error) {
                        Alert.alert(
                          '대결 취소 실패',
                          error instanceof Error
                            ? error.message
                            : '잠시 후 다시 시도해주세요.',
                        );
                      }
                    },
                  },
                ],
              );
            }}
            onForfeit={() => {
              Alert.alert(
                '기권하기',
                '기권하면 상대의 승리로 대결이 끝나요. 계속할까요?',
                [
                  { text: '아니요', style: 'cancel' },
                  {
                    text: '기권',
                    style: 'destructive',
                    onPress: () => {
                      leaveMutation.mutate(roomId, {
                        // 몰수 처리 후에는 나는 멤버가 아니라 이 화면을 못 읽는다.
                        onSuccess: () => setForfeitResult('FORFEITED'),
                        onError: error => {
                          // 검증 중인 칸이 있으면 서버가 나가기를 막는다.
                          Alert.alert(
                            '기권 실패',
                            error instanceof Error
                              ? error.message
                              : '잠시 후 다시 시도해주세요.',
                          );
                        },
                      });
                    },
                  },
                ],
              );
            }}
            onOpponentJoined={() => {
              // 수락 직후라 멤버 목록이 낡았다. 상대 아바타가 바로 보이게 다시 읽는다.
              roomQuery.refetch();
              boardQuery.refetch();
            }}
            onEnterBoard={() => navigation.navigate('BingoBoard', { roomId })}
            onMatchingCancelled={event => {
              Alert.alert(
                '대결이 취소됐어요',
                event.type === 'INVITATION_REJECTED'
                  ? '상대가 초대를 거절했어요.'
                  : '방장이 초대를 취소했어요.',
                [{ text: '확인', onPress: () => navigation.goBack() }],
              );
            }}
          />
        </ScrollView>

        <BattleResultModal
          result={forfeitResult}
          onConfirm={() => {
            setForfeitResult(null);
            navigation.popToTop();
          }}
        />
      </Screen>
    );
  }

  // 이미 종료된 방은 나가기가 409로 막히고 삭제도 의미가 없어 버튼을 숨긴다.
  // 방장 여부를 아직 모르는 동안(내 memberId 조회 전)에도 잘못된 버튼을 안 보여준다.
  const showFooter = myMemberId !== null && room.status !== 'CLOSED';

  return (
    <Screen edges={SCREEN_EDGES}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <RoomSummaryCard room={room} />

        <RoomMemberList
          members={room.members}
          myMemberId={myMemberId}
          pendingInvites={pendingInvites}
          onCancelInvite={handleCancelInvite}
          cancelingRequestId={cancelingRequestId}
        />

        {boardQuery.data ? (
          <RoomBingoCard
            board={boardQuery.data}
            members={room.members}
            myMemberId={myMemberId}
          />
        ) : (
          <Card>
            <BingoCardFallback
              isLoading={boardQuery.isLoading}
              error={boardQuery.error}
              onRetry={() => boardQuery.refetch()}
            />
          </Card>
        )}

        {showFooter ? (
          isHost ? (
            <Button
              label={deleteMutation.isPending ? '삭제 중...' : '모임 삭제'}
              accessibilityLabel="모임 삭제"
              variant="danger"
              icon="trash-outline"
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            />
          ) : (
            <Button
              label={leaveMutation.isPending ? '나가는 중...' : '모임 나가기'}
              accessibilityLabel="모임 나가기"
              variant="secondary"
              icon="exit-outline"
              onPress={handleLeave}
              disabled={leaveMutation.isPending}
            />
          )
        ) : null}

        {/* 카드 오프셋 그림자가 스크롤 끝에서 잘리지 않게. */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

function BingoCardFallback({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <AppText style={styles.cardStatusText}>빙고판을 불러오는 중...</AppText>;
  }

  // 아직 게임을 시작하지 않은 방은 활성 빙고판이 없어 404가 정상이다.
  if (error instanceof ApiError && error.status === 404) {
    return (
      <AppText style={styles.cardStatusText}>
        아직 진행 중인 빙고판이 없어요.
      </AppText>
    );
  }

  return (
    <Pressable onPress={onRetry}>
      <AppText style={styles.cardStatusText}>
        빙고판을 불러오지 못했어요.{'\n'}눌러서 다시 시도
      </AppText>
    </Pressable>
  );
}

const SCREEN_EDGES = ['bottom'] as const;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  statusText: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  cardStatusText: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
});

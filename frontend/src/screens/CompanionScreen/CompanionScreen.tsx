import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';

import type { FriendResponse } from '../../features/friend/api/friendApi';
import { useDeleteFriendMutation } from '../../features/friend/hooks/useDeleteFriendMutation';
import { useInfiniteFriendsQuery } from '../../features/friend/hooks/useFriendsQuery';
import { useReceivedRequestsQuery } from '../../features/friend/hooks/useReceivedRequestsQuery';
import { useSentRequestsQuery } from '../../features/friend/hooks/useSentRequestsQuery';
import type {
  MyRoomResponse,
  ReceivedRoomInvite,
} from '../../features/room/api/roomApi';
import { useRoomInviteAccept } from '../../features/room/hooks/useRoomInviteAccept';
import { useMyRoomsQuery } from '../../features/room/hooks/useMyRoomsQuery';
import { useReceivedRoomInvitesQuery } from '../../features/room/hooks/useReceivedRoomInvitesQuery';
import { useRejectRoomInviteMutation } from '../../features/room/hooks/useRejectRoomInviteMutation';
import { AppText } from '../../shared/components/AppText/AppText';
import { Fab } from '../../shared/components/Fab/Fab';
import { Header } from '../../shared/components/Header/Header';
import { Screen } from '../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../shared/components/SegmentedControl/SegmentedControl';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { AddFriendSheet } from './components/AddFriendSheet';
import { CreateWalkRoomScreen } from './components/CreateWalkRoomScreen';
import { FriendCard } from './components/FriendCard';
import { FriendRequestsSummaryCard } from './components/FriendRequestsSummaryCard';
import { ReceivedRoomInviteRow } from './components/ReceivedRoomInviteRow';
import { WalkRoomCard } from './components/WalkRoomCard';
import type { MyWalkRoom } from './types';
import { lineHeights } from '../../shared/constants/typography';

type CompanionTab = 'walkRooms' | 'friends';

type CompanionNavigation = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;

// 산책방 일정(scheduleLabel) 개념은 백엔드에 아직 없어 채우지 못한다.
function toMyWalkRoom(room: MyRoomResponse): MyWalkRoom {
  return {
    id: String(room.roomId),
    name: room.name,
    mode: room.mode === 'SINGLE' ? 'solo' : 'group',
    bingoCompleted: room.completedMissionCount,
    bingoTotal: room.totalMissionCount,
    memberCount: room.members.length,
    members: room.members,
  };
}

export function CompanionScreen() {
  const navigation = useNavigation<CompanionNavigation>();
  const [tab, setTab] = useState<CompanionTab>('walkRooms');
  const [isAddFriendVisible, setAddFriendVisible] = useState(false);
  const [isCreateRoomVisible, setCreateRoomVisible] = useState(false);
  const [pendingInviteRequestId, setPendingInviteRequestId] = useState<
    number | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const myRoomsQuery = useMyRoomsQuery();
  // 혼자 방을 항상 위로 올린다. 같은 mode끼리는 서버가 내려준 순서(참여일시 최신순)를 유지한다.
  const myWalkRooms = (myRoomsQuery.data ?? [])
    // 대결방은 한 판짜리라 산책방 목록에 두지 않는다. 진행 중인 대결로는
    // 홈의 '대결 이어가기' 버튼으로 돌아간다.
    .filter(room => room.mode !== 'BATTLE')
    .map(toMyWalkRoom)
    .sort((a, b) => Number(b.mode === 'solo') - Number(a.mode === 'solo'));
  const friendsQuery = useInfiniteFriendsQuery();
  const friends = useMemo(
    () => friendsQuery.data?.pages.flatMap(page => page.content) ?? [],
    [friendsQuery.data],
  );
  const receivedRequestsQuery = useReceivedRequestsQuery();
  const receivedRequestCount = receivedRequestsQuery.data?.content.length ?? 0;
  const sentRequestsQuery = useSentRequestsQuery();
  const sentRequestCount =
    sentRequestsQuery.data?.pages.flatMap(page => page.content).length ?? 0;
  const deleteFriendMutation = useDeleteFriendMutation();
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
  // 카운트다운 이벤트가 수락 응답보다 먼저 도착할 수 있다. 그 경우 수락 쪽
  // 이동이 파라미터 없는 route로 덮어써 카운트다운이 사라지므로, 이벤트가
  // 먼저 이동했으면 수락 쪽은 이동을 건너뛴다.
  const battleNavigatedRef = useRef(false);
  const { acceptInvite } = useRoomInviteAccept({
    enabled: hasPendingInvite,
    onBattleStarted: event => {
      // 빙고판으로 직행하지 않는다 — 대기방에서 상대와 같은 카운트다운을 보고
      // 함께 들어간다. 이벤트가 대기방 도착보다 먼저 와서 값을 실어 보낸다.
      battleNavigatedRef.current = true;
      navigation.navigate('WalkRoomDetail', {
        roomId: event.roomId,
        battleCountdownSeconds: event.countdownSeconds ?? undefined,
      });
    },
  });

  const handleDeleteFriend = (friend: FriendResponse) => {
    Alert.alert(
      '친구 삭제',
      `${friend.nickname}님을 친구 목록에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteFriendMutation.mutate(friend.memberId, {
              onSuccess: () => setToastMessage('친구를 삭제했어요.'),
              onError: error => {
                Alert.alert(
                  '친구 삭제 실패',
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

  const loadNextFriendsPage = () => {
    // onEndReached는 스크롤 도중 여러 번 발화해서, 막지 않으면 중복 요청한다.
    if (friendsQuery.hasNextPage && !friendsQuery.isFetchingNextPage) {
      friendsQuery.fetchNextPage();
    }
  };

  const handleAcceptInvite = async (invite: ReceivedRoomInvite) => {
    setPendingInviteRequestId(invite.requestId);
    try {
      battleNavigatedRef.current = false;
      await acceptInvite(invite);
      // 수락했으면 그 방을 바로 보여준다. 대결이면 mode === 'BATTLE'이라
      // 대기방이 그려지고, 곧 도착하는 카운트다운 이벤트가 값을 얹어준다.
      // 이벤트가 이미 이동시켰다면 여기서 또 이동하면 그 값을 지운다.
      if (!battleNavigatedRef.current) {
        navigation.navigate('WalkRoomDetail', { roomId: invite.roomId });
      }
    } catch (error) {
      Alert.alert(
        '초대 수락 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
      receivedInvitesQuery.refetch();
    } finally {
      setPendingInviteRequestId(null);
    }
  };

  const handleRejectInvite = (invite: ReceivedRoomInvite) => {
    Alert.alert(
      '산책방 초대 거절',
      `${invite.inviterNickname}님의 산책방 초대를 거절할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: () => {
            setPendingInviteRequestId(invite.requestId);
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
                onSettled: () => setPendingInviteRequestId(null),
              },
            );
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Header
          title="동행"
          subtitle="친구와 산책방을 만들어 함께 걸어보세요"
        />
        <SegmentedControl
          options={[
            { label: '내 산책방', value: 'walkRooms' },
            { label: '내 친구', value: 'friends' },
          ]}
          value={tab}
          onChange={setTab}
          labelStyle={styles.dohyeonText}
        />

        {tab === 'walkRooms' ? (
          myRoomsQuery.isLoading ? (
            <AppText style={styles.statusText}>불러오는 중...</AppText>
          ) : (
            <FlatList
              data={myWalkRooms}
              keyExtractor={room => room.id}
              ListHeaderComponent={
                <>
                  {receivedInvites.length > 0 ? (
                    <View style={styles.receivedRequests}>
                      <AppText style={styles.countLabel}>
                        받은 산책방 초대 {receivedInvites.length}
                      </AppText>
                      {receivedInvites.map(invite => (
                        <ReceivedRoomInviteRow
                          key={invite.requestId}
                          invite={invite}
                          onAccept={() => handleAcceptInvite(invite)}
                          onReject={() => handleRejectInvite(invite)}
                          disabled={pendingInviteRequestId === invite.requestId}
                        />
                      ))}
                    </View>
                  ) : null}
                  {myRoomsQuery.isError ? null : (
                    <AppText style={styles.countLabel}>
                      참여 중인 산책방 {myWalkRooms.length}
                    </AppText>
                  )}
                </>
              }
              ListEmptyComponent={
                myRoomsQuery.isError ? (
                  <Pressable onPress={() => myRoomsQuery.refetch()}>
                    <AppText style={styles.statusText}>
                      산책방 목록을 불러오지 못했어요.{'\n'}눌러서 다시 시도
                    </AppText>
                  </Pressable>
                ) : (
                  <AppText style={styles.statusText}>
                    아직 참여 중인 산책방이 없어요.
                  </AppText>
                )
              }
              renderItem={({ item }) => (
                <WalkRoomCard
                  room={item}
                  onPress={() =>
                    navigation.navigate('WalkRoomDetail', {
                      roomId: Number(item.id),
                    })
                  }
                />
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={myRoomsQuery.isRefetching || receivedInvitesQuery.isRefetching}
              onRefresh={() => {
                myRoomsQuery.refetch();
                receivedInvitesQuery.refetch();
              }}
            />
          )
        ) : friendsQuery.isLoading ? (
          <AppText style={styles.statusText}>불러오는 중...</AppText>
        ) : friendsQuery.isError ? (
          <AppText style={styles.statusText}>친구 목록을 불러오지 못했어요.</AppText>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={friend => String(friend.memberId)}
            ListHeaderComponent={
              <>
                {receivedRequestCount > 0 || sentRequestCount > 0 ? (
                  <View style={styles.receivedRequests}>
                    <FriendRequestsSummaryCard
                      receivedCount={receivedRequestCount}
                      sentCount={sentRequestCount}
                      onPress={() => navigation.navigate('FriendRequests')}
                    />
                  </View>
                ) : null}
                <AppText style={styles.countLabel}>내 친구 {friends.length}</AppText>
              </>
            }
            renderItem={({ item }) => (
              <FriendCard
                friend={item}
                onDelete={() => handleDeleteFriend(item)}
              />
            )}
            onEndReached={loadNextFriendsPage}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListFooterComponent={
              <View style={styles.footer}>
                {friendsQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
              </View>
            }
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={
              (friendsQuery.isRefetching && !friendsQuery.isFetchingNextPage) ||
              receivedRequestsQuery.isRefetching ||
              sentRequestsQuery.isRefetching
            }
            onRefresh={() => {
              friendsQuery.refetch();
              receivedRequestsQuery.refetch();
              sentRequestsQuery.refetch();
            }}
          />
        )}
      </View>

      <View style={styles.fabWrapper}>
        <Fab
          icon="add"
          onPress={() => {
            if (tab === 'friends') {
              setAddFriendVisible(true);
              return;
            }
            setCreateRoomVisible(true);
          }}
        />
      </View>

      <AddFriendSheet
        visible={isAddFriendVisible}
        onClose={() => setAddFriendVisible(false)}
      />

      <CreateWalkRoomScreen
        visible={isCreateRoomVisible}
        onClose={() => setCreateRoomVisible(false)}
        onCreated={() => {
          setCreateRoomVisible(false);
          setToastMessage('산책방을 만들었어요.');
          myRoomsQuery.refetch();
        }}
      />

      <Toast
        message={toastMessage}
        onHide={() => setToastMessage(null)}
        respectBottomInset={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    // 하단은 의도적으로 비움: FlatList 뷰포트가 탭 바로 위까지 닿게 하고,
    // 스크롤 콘텐츠 쪽(listContent)에서 아래 여백을 준다.
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  countLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  receivedRequests: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  dohyeonText: {
    fontFamily: 'BMDOHYEON',
  },
  list: {
    flex: 1,
    marginTop: spacing.sm,
  },
  listContent: {
    gap: spacing.md,
    // FAB/화면 하단에 가려지지 않도록 스크롤 콘텐츠 끝에 여유를 둔다.
    paddingBottom: spacing.lg * 3,
  },
  fabWrapper: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  footer: {
    // 스피너가 들어와도 목록이 튀지 않게 자리를 잡아둔다.
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

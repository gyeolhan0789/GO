import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import type {
  FriendResponse,
  ReceivedFriendRequest,
} from '../../features/friend/api/friendApi';
import { useAcceptFriendRequestMutation } from '../../features/friend/hooks/useAcceptFriendRequestMutation';
import { useDeleteFriendMutation } from '../../features/friend/hooks/useDeleteFriendMutation';
import { useFriendsQuery } from '../../features/friend/hooks/useFriendsQuery';
import { useReceivedRequestsQuery } from '../../features/friend/hooks/useReceivedRequestsQuery';
import { useRejectFriendRequestMutation } from '../../features/friend/hooks/useRejectFriendRequestMutation';
import type {
  MyRoomResponse,
  ReceivedRoomInvite,
} from '../../features/room/api/roomApi';
import { useAcceptRoomInviteMutation } from '../../features/room/hooks/useAcceptRoomInviteMutation';
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
import { ReceivedRequestRow } from './components/ReceivedRequestRow';
import { ReceivedRoomInviteRow } from './components/ReceivedRoomInviteRow';
import { WalkRoomCard } from './components/WalkRoomCard';
import type { MyWalkRoom } from './types';
import { lineHeights } from '../../shared/constants/typography';

type CompanionTab = 'walkRooms' | 'friends';

// 산책방 일정(scheduleLabel) 개념은 백엔드에 아직 없어 채우지 못한다.
function toMyWalkRoom(room: MyRoomResponse): MyWalkRoom {
  return {
    id: String(room.roomId),
    name: room.name,
    mode: room.mode === 'SINGLE' ? 'solo' : 'group',
    bingoCompleted: room.completedMissionCount,
    bingoTotal: room.totalMissionCount,
    memberCount: room.members.length,
  };
}

export function CompanionScreen() {
  const [tab, setTab] = useState<CompanionTab>('walkRooms');
  const [isAddFriendVisible, setAddFriendVisible] = useState(false);
  const [isCreateRoomVisible, setCreateRoomVisible] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [pendingInviteRequestId, setPendingInviteRequestId] = useState<
    number | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const myRoomsQuery = useMyRoomsQuery();
  // 혼자 방을 항상 위로 올린다. 같은 mode끼리는 서버가 내려준 순서(참여일시 최신순)를 유지한다.
  const myWalkRooms = (myRoomsQuery.data?.map(toMyWalkRoom) ?? []).sort(
    (a, b) => Number(b.mode === 'solo') - Number(a.mode === 'solo'),
  );
  const friendsQuery = useFriendsQuery();
  const friends = friendsQuery.data?.content ?? [];
  const receivedRequestsQuery = useReceivedRequestsQuery();
  const receivedRequests = receivedRequestsQuery.data?.content ?? [];
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const deleteFriendMutation = useDeleteFriendMutation();
  const receivedInvitesQuery = useReceivedRoomInvitesQuery();
  const receivedInvites = receivedInvitesQuery.data ?? [];
  const acceptInviteMutation = useAcceptRoomInviteMutation();
  const rejectInviteMutation = useRejectRoomInviteMutation();

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

  const handleAccept = (request: ReceivedFriendRequest) => {
    setPendingRequestId(request.requestId);
    acceptRequestMutation.mutate(request.requestId, {
      onSuccess: () => setToastMessage('친구 요청을 수락했어요.'),
      onError: error => {
        Alert.alert(
          '친구 요청 수락 실패',
          error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        );
        // 이미 처리된 요청 등으로 실패했을 수 있으니 목록을 최신 상태로 맞춘다.
        receivedRequestsQuery.refetch();
      },
      onSettled: () => setPendingRequestId(null),
    });
  };

  const handleReject = (request: ReceivedFriendRequest) => {
    Alert.alert(
      '친구 요청 거절',
      `${request.inviterNickname}님의 친구 요청을 거절할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: () => {
            setPendingRequestId(request.requestId);
            rejectRequestMutation.mutate(request.requestId, {
              onSuccess: () => setToastMessage('친구 요청을 거절했어요.'),
              onError: error => {
                Alert.alert(
                  '친구 요청 거절 실패',
                  error instanceof Error
                    ? error.message
                    : '잠시 후 다시 시도해주세요.',
                );
                // 이미 처리된 요청 등으로 실패했을 수 있으니 목록을 최신 상태로 맞춘다.
                receivedRequestsQuery.refetch();
              },
              onSettled: () => setPendingRequestId(null),
            });
          },
        },
      ],
    );
  };

  const handleAcceptInvite = (invite: ReceivedRoomInvite) => {
    setPendingInviteRequestId(invite.requestId);
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
        onSettled: () => setPendingInviteRequestId(null),
      },
    );
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
                <WalkRoomCard room={item} onPress={() => {}} />
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={myRoomsQuery.isRefetching}
              onRefresh={() => myRoomsQuery.refetch()}
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
                {receivedRequests.length > 0 ? (
                  <View style={styles.receivedRequests}>
                    <AppText style={styles.countLabel}>
                      받은 친구 요청 {receivedRequests.length}
                    </AppText>
                    {receivedRequests.map(request => (
                      <ReceivedRequestRow
                        key={request.requestId}
                        request={request}
                        onAccept={() => handleAccept(request)}
                        onReject={() => handleReject(request)}
                        disabled={pendingRequestId === request.requestId}
                      />
                    ))}
                  </View>
                ) : null}
                <AppText style={styles.countLabel}>내 친구 {friends.length}</AppText>
              </>
            }
            renderItem={({ item }) => (
              <FriendCard
                friend={item}
                onLongPress={() => handleDeleteFriend(item)}
              />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={friendsQuery.isRefetching}
            onRefresh={() => friendsQuery.refetch()}
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
});

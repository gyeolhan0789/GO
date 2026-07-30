import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import type {
  FriendResponse,
  ReceivedFriendRequest,
} from '../../features/friend/api/friendApi';
import { useAcceptFriendRequestMutation } from '../../features/friend/hooks/useAcceptFriendRequestMutation';
import { useDeleteFriendMutation } from '../../features/friend/hooks/useDeleteFriendMutation';
import { useFriendsQuery } from '../../features/friend/hooks/useFriendsQuery';
import { useReceivedRequestsQuery } from '../../features/friend/hooks/useReceivedRequestsQuery';
import { useRejectFriendRequestMutation } from '../../features/friend/hooks/useRejectFriendRequestMutation';
import { Fab } from '../../shared/components/Fab/Fab';
import { Screen } from '../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../shared/components/SegmentedControl/SegmentedControl';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { AddFriendSheet } from './components/AddFriendSheet';
import { CreateWalkRoomScreen } from './components/CreateWalkRoomScreen';
import { FriendCard } from './components/FriendCard';
import { ReceivedRequestRow } from './components/ReceivedRequestRow';
import { WalkRoomCard } from './components/WalkRoomCard';
import type { MyWalkRoom } from './types';

type CompanionTab = 'walkRooms' | 'friends';

// TODO: 실제 참여 중인 산책방/친구 API 연동 전까지의 임시 목업 데이터.
const MOCK_WALK_ROOMS: MyWalkRoom[] = [
  {
    id: 'weekly-solo',
    name: '나의 주간 산책방',
    mode: 'solo',
    bingoCompleted: 4,
    bingoTotal: 9,
  },
  {
    id: 'with-minseo',
    name: '민서와 걷기',
    mode: 'group',
    bingoCompleted: 3,
    bingoTotal: 9,
    memberCount: 2,
    scheduleLabel: '오늘 오후 8:00 예정',
  },
  {
    id: 'ssafy-team',
    name: 'SSAFY 팀 산책',
    mode: 'group',
    bingoCompleted: 2,
    bingoTotal: 9,
    memberCount: 4,
    scheduleLabel: '다음 산책 미정',
  },
  {
    id: 'morning-jog',
    name: '아침 조깅 클럽',
    mode: 'group',
    bingoCompleted: 6,
    bingoTotal: 9,
    memberCount: 3,
    scheduleLabel: '내일 오전 7:00 예정',
  },
  {
    id: 'evening-walk',
    name: '저녁 산책 모임',
    mode: 'group',
    bingoCompleted: 1,
    bingoTotal: 9,
    memberCount: 5,
    scheduleLabel: '다음 산책 미정',
  },
  {
    id: 'solo-time',
    name: '혼자 걷는 시간',
    mode: 'solo',
    bingoCompleted: 7,
    bingoTotal: 9,
  },
  {
    id: 'neighborhood-loop',
    name: '동네 한바퀴',
    mode: 'group',
    bingoCompleted: 5,
    bingoTotal: 9,
    memberCount: 2,
    scheduleLabel: '오늘 오후 6:30 예정',
  },
  {
    id: 'dog-walk',
    name: '강아지랑 산책',
    mode: 'solo',
    bingoCompleted: 9,
    bingoTotal: 9,
  },
  {
    id: 'weekend-hiking',
    name: '주말 등산팀',
    mode: 'group',
    bingoCompleted: 0,
    bingoTotal: 9,
    memberCount: 6,
    scheduleLabel: '다음 산책 미정',
  },
  {
    id: 'lunch-walk',
    name: '점심 산책',
    mode: 'group',
    bingoCompleted: 4,
    bingoTotal: 9,
    memberCount: 2,
    scheduleLabel: '오늘 오후 1:00 예정',
  },
];

export function CompanionScreen() {
  const [tab, setTab] = useState<CompanionTab>('walkRooms');
  const [isAddFriendVisible, setAddFriendVisible] = useState(false);
  const [isCreateRoomVisible, setCreateRoomVisible] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const friendsQuery = useFriendsQuery();
  const friends = friendsQuery.data?.content ?? [];
  const receivedRequestsQuery = useReceivedRequestsQuery();
  const receivedRequests = receivedRequestsQuery.data?.content ?? [];
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const deleteFriendMutation = useDeleteFriendMutation();

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

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>동행</Text>
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
          <FlatList
            data={MOCK_WALK_ROOMS}
            keyExtractor={room => room.id}
            ListHeaderComponent={
              <Text style={styles.countLabel}>
                참여 중인 산책방 {MOCK_WALK_ROOMS.length}
              </Text>
            }
            renderItem={({ item }) => (
              <WalkRoomCard room={item} onPress={() => {}} />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : friendsQuery.isLoading ? (
          <Text style={styles.statusText}>불러오는 중...</Text>
        ) : friendsQuery.isError ? (
          <Text style={styles.statusText}>친구 목록을 불러오지 못했어요.</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={friend => String(friend.memberId)}
            ListHeaderComponent={
              <>
                {receivedRequests.length > 0 ? (
                  <View style={styles.receivedRequests}>
                    <Text style={styles.countLabel}>
                      받은 친구 요청 {receivedRequests.length}
                    </Text>
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
                <Text style={styles.countLabel}>내 친구 {friends.length}</Text>
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
  pageTitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 28,
    color: colors.ink,
  },
  countLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
  },
  receivedRequests: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
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

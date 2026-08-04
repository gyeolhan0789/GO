import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import type {
  ReceivedFriendRequest,
  SentFriendRequest,
} from '../../features/friend/api/friendApi';
import { useAcceptFriendRequestMutation } from '../../features/friend/hooks/useAcceptFriendRequestMutation';
import { useCancelFriendRequestMutation } from '../../features/friend/hooks/useCancelFriendRequestMutation';
import { useReceivedRequestsQuery } from '../../features/friend/hooks/useReceivedRequestsQuery';
import { useRejectFriendRequestMutation } from '../../features/friend/hooks/useRejectFriendRequestMutation';
import { useSentRequestsQuery } from '../../features/friend/hooks/useSentRequestsQuery';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../shared/components/SegmentedControl/SegmentedControl';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { ReceivedRequestRow } from './components/ReceivedRequestRow';
import { SentRequestRow } from './components/SentRequestRow';

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;

const SCREEN_EDGES = ['bottom'] as const;

type RequestTab = 'received' | 'sent';

/**
 * 받은 친구 요청과 내가 보낸 친구 요청을 한 화면에서 탭으로 오간다.
 * 보낸 요청은 서버가 아직 응답받지 않은 것만 내려주므로 목록에 남은 항목은
 * 전부 취소할 수 있다 — 수락된 요청은 친구 목록(동행 탭)으로 넘어가고,
 * 거절된 요청은 어디에도 남지 않는다.
 */
export function FriendRequestsScreen() {
  const [tab, setTab] = useState<RequestTab>('received');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const receivedRequestsQuery = useReceivedRequestsQuery();
  const receivedRequests = receivedRequestsQuery.data?.content ?? [];
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const [pendingReceivedId, setPendingReceivedId] = useState<number | null>(
    null,
  );

  const sentRequestsQuery = useSentRequestsQuery();
  const sentRequests = useMemo(
    () => sentRequestsQuery.data?.pages.flatMap(page => page.content) ?? [],
    [sentRequestsQuery.data],
  );
  const cancelRequestMutation = useCancelFriendRequestMutation();
  const [pendingSentId, setPendingSentId] = useState<number | null>(null);

  const handleAccept = (request: ReceivedFriendRequest) => {
    setPendingReceivedId(request.requestId);
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
      onSettled: () => setPendingReceivedId(null),
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
            setPendingReceivedId(request.requestId);
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
              onSettled: () => setPendingReceivedId(null),
            });
          },
        },
      ],
    );
  };

  const loadNextSentPage = () => {
    // onEndReached는 스크롤 도중 여러 번 발화해서, 막지 않으면 중복 요청한다.
    if (sentRequestsQuery.hasNextPage && !sentRequestsQuery.isFetchingNextPage) {
      sentRequestsQuery.fetchNextPage();
    }
  };

  const cancelSentRequest = (request: SentFriendRequest) => {
    setPendingSentId(request.requestId);
    cancelRequestMutation.mutate(request.requestId, {
      onSuccess: () => setToastMessage('친구 요청을 취소했어요.'),
      onError: error => {
        Alert.alert('친구 요청 취소 실패', resolveApiErrorMessage(error));
        // 그사이 상대가 수락·거절해 실패했을 수 있으니 목록을 최신 상태로 맞춘다.
        sentRequestsQuery.refetch();
      },
      onSettled: () => setPendingSentId(null),
    });
  };

  const confirmCancelSentRequest = (request: SentFriendRequest) => {
    Alert.alert(
      '친구 요청 취소',
      `${request.inviteeNickname}님에게 보낸 친구 요청을 취소할까요?`,
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '요청 취소',
          style: 'destructive',
          onPress: () => cancelSentRequest(request),
        },
      ],
    );
  };

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        <SegmentedControl
          options={[
            { label: `받은 요청 ${receivedRequests.length}`, value: 'received' },
            { label: `보낸 요청 ${sentRequests.length}`, value: 'sent' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'received' ? (
          receivedRequestsQuery.isLoading ? (
            <AppText style={styles.statusText}>불러오는 중...</AppText>
          ) : receivedRequestsQuery.isError ? (
            <Pressable
              onPress={() => receivedRequestsQuery.refetch()}
              accessibilityRole="button"
              accessibilityLabel="받은 요청 다시 불러오기"
            >
              <AppText style={styles.statusText}>
                받은 친구 요청을 불러오지 못했어요.{'\n'}눌러서 다시 시도
              </AppText>
            </Pressable>
          ) : (
            <FlatList
              data={receivedRequests}
              keyExtractor={request => String(request.requestId)}
              renderItem={({ item }) => (
                <ReceivedRequestRow
                  request={item}
                  onAccept={() => handleAccept(item)}
                  onReject={() => handleReject(item)}
                  disabled={pendingReceivedId === item.requestId}
                />
              )}
              ListEmptyComponent={
                <AppText style={styles.statusText}>
                  받은 친구 요청이 없어요.
                </AppText>
              }
              refreshing={receivedRequestsQuery.isRefetching}
              onRefresh={() => receivedRequestsQuery.refetch()}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : sentRequestsQuery.isLoading ? (
          <AppText style={styles.statusText}>불러오는 중...</AppText>
        ) : sentRequestsQuery.isError ? (
          <Pressable
            onPress={() => sentRequestsQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="보낸 요청 다시 불러오기"
          >
            <AppText style={styles.statusText}>
              보낸 친구 요청을 불러오지 못했어요.{'\n'}눌러서 다시 시도
            </AppText>
          </Pressable>
        ) : (
          <FlatList
            data={sentRequests}
            keyExtractor={request => String(request.requestId)}
            renderItem={({ item }) => (
              <SentRequestRow
                request={item}
                onCancel={() => confirmCancelSentRequest(item)}
                disabled={pendingSentId === item.requestId}
              />
            )}
            onEndReached={loadNextSentPage}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListEmptyComponent={
              <AppText style={styles.statusText}>
                보낸 친구 요청이 없어요.{'\n'}동행 탭에서 닉네임으로 친구를 찾아
                추가할 수 있어요.
              </AppText>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {sentRequestsQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
              </View>
            }
            refreshing={
              sentRequestsQuery.isRefetching &&
              !sentRequestsQuery.isFetchingNextPage
            }
            onRefresh={() => sentRequestsQuery.refetch()}
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
    gap: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
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
  footer: {
    // 스피너가 들어와도 목록이 튀지 않게 자리를 잡아둔다.
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

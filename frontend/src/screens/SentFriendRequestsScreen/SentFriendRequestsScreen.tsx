import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import type { SentFriendRequest } from '../../features/friend/api/friendApi';
import { useCancelFriendRequestMutation } from '../../features/friend/hooks/useCancelFriendRequestMutation';
import { useSentRequestsQuery } from '../../features/friend/hooks/useSentRequestsQuery';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../shared/constants/typography';
import { SentRequestRow } from './components/SentRequestRow';

// 화면 끝에서 반 화면 남았을 때 다음 페이지를 부른다.
const END_REACHED_THRESHOLD = 0.5;

const SCREEN_EDGES = ['bottom'] as const;

/**
 * 내가 보낸 친구 요청 내역. 서버는 상대가 아직 응답하지 않은 요청만 내려주므로
 * 목록에 남아 있는 항목은 전부 취소할 수 있다 — 수락된 요청은 친구 목록(동행 탭)
 * 으로 넘어가고, 거절된 요청은 어디에도 남지 않는다.
 */
export function SentFriendRequestsScreen() {
  const sentRequestsQuery = useSentRequestsQuery();
  const cancelRequestMutation = useCancelFriendRequestMutation();
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const requests = useMemo(
    () => sentRequestsQuery.data?.pages.flatMap(page => page.content) ?? [],
    [sentRequestsQuery.data],
  );

  const loadNextPage = () => {
    // onEndReached는 스크롤 도중 여러 번 발화해서, 막지 않으면 중복 요청한다.
    if (
      sentRequestsQuery.hasNextPage &&
      !sentRequestsQuery.isFetchingNextPage
    ) {
      sentRequestsQuery.fetchNextPage();
    }
  };

  const cancelRequest = (request: SentFriendRequest) => {
    setPendingRequestId(request.requestId);
    cancelRequestMutation.mutate(request.requestId, {
      onSuccess: () => setToastMessage('친구 요청을 취소했어요.'),
      onError: error => {
        Alert.alert('친구 요청 취소 실패', resolveApiErrorMessage(error));
        // 그사이 상대가 수락·거절해 실패했을 수 있으니 목록을 최신 상태로 맞춘다.
        sentRequestsQuery.refetch();
      },
      onSettled: () => setPendingRequestId(null),
    });
  };

  const confirmCancel = (request: SentFriendRequest) => {
    Alert.alert(
      '친구 요청 취소',
      `${request.inviteeNickname}님에게 보낸 친구 요청을 취소할까요?`,
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '요청 취소',
          style: 'destructive',
          onPress: () => cancelRequest(request),
        },
      ],
    );
  };

  return (
    <Screen edges={SCREEN_EDGES}>
      <View style={styles.container}>
        {sentRequestsQuery.isLoading ? (
          <AppText style={styles.statusText}>불러오는 중...</AppText>
        ) : sentRequestsQuery.isError ? (
          <Pressable
            onPress={() => sentRequestsQuery.refetch()}
            accessibilityRole="button"
            accessibilityLabel="친구 추가 내역 다시 불러오기"
          >
            <AppText style={styles.statusText}>
              친구 추가 내역을 불러오지 못했어요.{'\n'}눌러서 다시 시도
            </AppText>
          </Pressable>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={request => String(request.requestId)}
            // 비어 있을 때는 개수 대신 ListEmptyComponent의 안내만 남긴다.
            ListHeaderComponent={
              requests.length > 0 ? (
                <View style={styles.listHeader}>
                  <AppText style={styles.countLabel}>
                    보낸 요청 {requests.length}
                  </AppText>
                  <AppText style={styles.helperText}>
                    상대가 수락하면 친구 목록에 추가돼요.
                  </AppText>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <SentRequestRow
                request={item}
                onCancel={() => confirmCancel(item)}
                disabled={pendingRequestId === item.requestId}
              />
            )}
            onEndReached={loadNextPage}
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  listHeader: {
    gap: spacing.xs,
  },
  countLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  helperText: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.inkMuted,
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

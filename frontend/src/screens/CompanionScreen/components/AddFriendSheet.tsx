import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import type { MemberRelationshipStatus } from '../../../features/friend/api/friendApi';
import { useMemberSearchQuery } from '../../../features/friend/hooks/useMemberSearchQuery';
import { useSendFriendRequestMutation } from '../../../features/friend/hooks/useSendFriendRequestMutation';
import { AppText } from '../../../shared/components/AppText/AppText';
import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights, MAX_FONT_SCALE } from '../../../shared/constants/typography';

const STATUS_LABEL: Record<MemberRelationshipStatus, string> = {
  NONE: '추가',
  FRIEND: '친구',
  REQUEST_SENT: '요청됨',
  REQUEST_RECEIVED: '수락 대기',
};

const SEARCH_DEBOUNCE_MS = 300;

type AddFriendSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddFriendSheet({ visible, onClose }: AddFriendSheetProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useMemberSearchQuery(debouncedQuery);
  const results = searchQuery.data?.content ?? [];
  const sendRequestMutation = useSendFriendRequestMutation();

  const handleInvite = (memberId: number) => {
    setPendingMemberId(memberId);
    sendRequestMutation.mutate(memberId, {
      onError: error => {
        Alert.alert(
          '친구 요청 실패',
          error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        );
      },
      onSettled: () => setPendingMemberId(null),
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="친구 추가">
      <AppText style={styles.helperText}>
        닉네임으로 검색해서 친구를 추가해요.
      </AppText>

      <TextInput
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={styles.input}
        placeholder="닉네임 입력"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {debouncedQuery.trim() ? (
        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {searchQuery.isLoading ? (
            <AppText style={styles.emptyText}>검색 중...</AppText>
          ) : searchQuery.isError ? (
            <AppText style={styles.emptyText}>검색에 실패했어요.</AppText>
          ) : results.length === 0 ? (
            <AppText style={styles.emptyText}>검색 결과가 없어요.</AppText>
          ) : (
            results.map(member => {
              const isPending =
                pendingMemberId === member.memberId &&
                sendRequestMutation.isPending;
              const isActionable = member.relationshipStatus === 'NONE';

              return (
                <View key={member.memberId} style={styles.resultRow}>
                  <View style={styles.avatar} />
                  <AppText style={styles.resultNickname} numberOfLines={1}>
                    @{member.nickname}
                  </AppText>
                  <Pressable
                    onPress={() => handleInvite(member.memberId)}
                    disabled={!isActionable || isPending}
                    style={[
                      styles.inviteButton,
                      (!isActionable || isPending) && styles.inviteButtonDone,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.inviteButtonText,
                        (!isActionable || isPending) &&
                          styles.inviteButtonTextDone,
                      ]}
                    >
                      {isPending
                        ? '요청 중...'
                        : STATUS_LABEL[member.relationshipStatus]}
                    </AppText>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    marginBottom: spacing.md,
  },
  input: {
    height: controlHeight.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    // TextInput에는 lineHeight를 주지 않는다(안드로이드에서 글자가 밀린다).
    // font padding을 끄고 한 줄 입력이라 세로 가운데로 맞춘다.
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.ink,
  },
  results: {
    maxHeight: 280,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  resultNickname: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  inviteButton: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inviteButtonDone: {
    borderColor: colors.neutralBg,
    backgroundColor: colors.neutralBg,
  },
  inviteButtonText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  inviteButtonTextDone: {
    color: colors.muted,
  },
});

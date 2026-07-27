import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import type { MemberRelationshipStatus, SearchableFriend } from '../types';

// TODO: 실제 닉네임 검색 API 연동 전까지의 임시 목업 데이터.
const MOCK_DIRECTORY: SearchableFriend[] = [
  { id: 'user-youngju', nickname: 'YOUNGJU', relationshipStatus: 'NONE' },
  { id: 'user-minseo', nickname: 'MINSEO_K', relationshipStatus: 'NONE' },
  { id: 'user-jihoon', nickname: 'JIHOONP', relationshipStatus: 'FRIEND' },
  {
    id: 'user-suah',
    nickname: 'SUAH_C',
    relationshipStatus: 'REQUEST_SENT',
  },
];

const STATUS_LABEL: Record<MemberRelationshipStatus, string> = {
  NONE: '초대',
  FRIEND: '친구',
  REQUEST_SENT: '요청됨',
  REQUEST_RECEIVED: '수락 대기',
};

type AddFriendSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function matchesQuery(friend: SearchableFriend, query: string): boolean {
  return friend.nickname.toLowerCase().includes(query.trim().toLowerCase());
}

export function AddFriendSheet({ visible, onClose }: AddFriendSheetProps) {
  const [query, setQuery] = useState('');
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  const results = query.trim()
    ? MOCK_DIRECTORY.filter(friend => matchesQuery(friend, query))
    : [];

  const handleInvite = (id: string) => {
    setSentRequestIds(prev => new Set(prev).add(id));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="친구 추가">
      <Text style={styles.helperText}>
        닉네임으로 검색해서 친구를 추가해요.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="닉네임 입력"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {query.trim() ? (
        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
          ) : (
            results.map(friend => {
              const status = sentRequestIds.has(friend.id)
                ? 'REQUEST_SENT'
                : friend.relationshipStatus;
              const isActionable = status === 'NONE';

              return (
                <View key={friend.id} style={styles.resultRow}>
                  <View style={styles.avatar} />
                  <Text style={styles.resultNickname} numberOfLines={1}>
                    @{friend.nickname}
                  </Text>
                  <Pressable
                    onPress={() => handleInvite(friend.id)}
                    disabled={!isActionable}
                    style={[
                      styles.inviteButton,
                      !isActionable && styles.inviteButtonDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inviteButtonText,
                        !isActionable && styles.inviteButtonTextDone,
                      ]}
                    >
                      {STATUS_LABEL[status]}
                    </Text>
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
    color: colors.ink,
    opacity: 0.6,
    marginBottom: spacing.md,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    color: colors.ink,
  },
  results: {
    maxHeight: 280,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
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
    color: colors.ink,
  },
  inviteButtonTextDone: {
    color: colors.muted,
  },
});

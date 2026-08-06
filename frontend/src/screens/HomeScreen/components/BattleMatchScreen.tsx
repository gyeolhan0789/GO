import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { useFriendsQuery } from '../../../features/friend/hooks/useFriendsQuery';
import { useCreateRoomMutation } from '../../../features/room/hooks/useCreateRoomMutation';
import { useInviteToRoomMutation } from '../../../features/room/hooks/useInviteToRoomMutation';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Button } from '../../../shared/components/Button/Button';
import { Screen } from '../../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl/SegmentedControl';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { controlHeight } from '../../../shared/constants/sizing';
import { spacing } from '../../../shared/constants/spacing';
import {
  fontFamily,
  lineHeights,
  MAX_FONT_SCALE,
} from '../../../shared/constants/typography';

type BoardSizeOption = '3' | '4' | '5';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

const DEFAULT_BOARD_SIZE: BoardSizeOption = '3';
const DEFAULT_BINGO_GOAL = '1';

/**
 * 한 판에서 나올 수 있는 빙고 줄 수의 최대치 — 가로 n, 세로 n, 대각선 2.
 * 서버도 같은 식으로 검증해서 넘기면 BINGO_TARGET_COUNT_INVALID가 난다.
 */
function maxBingoLines(boardSize: number): number {
  return 2 * boardSize + 2;
}

type BattleMatchScreenProps = {
  visible: boolean;
  onClose: () => void;
  /** 방을 만들고 초대까지 보낸 뒤. 대기방으로 보내는 건 호출부가 한다. */
  onInvited: (roomId: number) => void;
};

/**
 * 대결 상대를 고르고 신청까지 보내는 전체 화면.
 *
 * 대결은 한 판으로 끝나서 동행 탭의 산책방처럼 남겨두는 물건이 아니다. 그래서
 * 방 만들기 흐름과 분리해 홈에서 바로 신청하고, 방은 이 안에서 조용히 만든다.
 * 껍데기는 모임방 만들기(CreateWalkRoomScreen)와 같은 풀스크린 모달이다.
 *
 * 지금 접속한 친구만 골라주지는 못한다 — 서버가 접속 상태를 들고 있지 않다.
 */
export function BattleMatchScreen({
  visible,
  onClose,
  onInvited,
}: BattleMatchScreenProps) {
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [boardSize, setBoardSize] =
    useState<BoardSizeOption>(DEFAULT_BOARD_SIZE);
  const [bingoGoal, setBingoGoal] = useState(DEFAULT_BINGO_GOAL);

  const friendsQuery = useFriendsQuery({ enabled: visible });
  const friends = friendsQuery.data?.content ?? [];

  const createRoomMutation = useCreateRoomMutation();
  const inviteMutation = useInviteToRoomMutation();
  const isSending = createRoomMutation.isPending || inviteMutation.isPending;

  // 닫았다 다시 열면 지난 선택이 남아 있지 않게 한다.
  useEffect(() => {
    if (!visible) {
      setSelectedFriendId(null);
      setBoardSize(DEFAULT_BOARD_SIZE);
      setBingoGoal(DEFAULT_BINGO_GOAL);
    }
  }, [visible]);

  const handleSend = async () => {
    if (selectedFriendId === null) {
      Alert.alert('대결할 친구를 한 명 골라주세요.');
      return;
    }

    const goal = Number(bingoGoal);
    const maximum = maxBingoLines(Number(boardSize));
    if (!bingoGoal || goal < 1 || goal > maximum) {
      Alert.alert(
        '목표 빙고 줄 수를 확인해주세요.',
        `${boardSize} x ${boardSize} 판에서는 1줄부터 ${maximum}줄까지 정할 수 있어요.`,
      );
      return;
    }

    const opponent = friends.find(
      friend => friend.memberId === selectedFriendId,
    );

    try {
      const room = await createRoomMutation.mutateAsync({
        name: `${opponent?.nickname ?? '친구'}님과의 대결`,
        mode: 'BATTLE',
        boardSize: Number(boardSize) as 3 | 4 | 5,
        targetBingoCount: goal,
        // 대결에 targetStepCount를 실으면 서버가 400으로 막는다.
      });
      await inviteMutation.mutateAsync({
        roomId: room.roomId,
        inviteeId: selectedFriendId,
      });
      onInvited(room.roomId);
    } catch (error) {
      Alert.alert(
        '대결 신청 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
          <AppText style={styles.headerTitle}>대결 신청</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.label}>누구와 대결할까요?</AppText>
          {friendsQuery.isLoading ? (
            <AppText style={styles.statusText}>불러오는 중...</AppText>
          ) : friendsQuery.isError ? (
            <AppText style={styles.statusText}>
              친구 목록을 불러오지 못했어요.
            </AppText>
          ) : friends.length === 0 ? (
            <AppText style={styles.statusText}>
              아직 친구가 없어요. 동행 탭에서 친구를 추가해보세요.
            </AppText>
          ) : (
            <View style={styles.list}>
              {friends.map(friend => {
                const selected = friend.memberId === selectedFriendId;
                return (
                  <Pressable
                    key={friend.memberId}
                    onPress={() => setSelectedFriendId(friend.memberId)}
                    style={[styles.row, selected && styles.rowSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${friend.nickname}과 대결`}
                  >
                    <View style={styles.avatarWrap}>
                      <MemberAvatar
                        gender={friend.gender}
                        defaultImageUrl={friend.defaultImageUrl ?? null}
                        equippedItems={friend.equippedItems}
                        style={styles.avatar}
                      />
                    </View>
                    <AppText style={styles.nickname} numberOfLines={1}>
                      {friend.nickname}
                    </AppText>
                    <View
                      style={[styles.radio, selected && styles.radioSelected]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.surface}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <AppText style={styles.label}>빙고 크기</AppText>
          <SegmentedControl
            options={BOARD_SIZE_OPTIONS}
            value={boardSize}
            onChange={setBoardSize}
          />

          <AppText style={styles.label}>목표 빙고 줄 수</AppText>
          <TextInput
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.input}
            placeholder={`1 ~ ${maxBingoLines(Number(boardSize))}`}
            placeholderTextColor={colors.muted}
            value={bingoGoal}
            onChangeText={text => setBingoGoal(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <AppText style={styles.hint}>
            각자 빙고판을 받아, 목표 줄 수에 먼저 닿는 쪽이 이겨요.
          </AppText>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={isSending ? '신청 중...' : '대결 신청'}
            disabled={selectedFriendId === null || isSending}
            onPress={handleSend}
          />
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: lineHeights[18],
    color: colors.ink,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  list: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.ink,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nickname: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
  },
  radioSelected: {
    backgroundColor: colors.primary,
  },
  input: {
    height: controlHeight.md,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});

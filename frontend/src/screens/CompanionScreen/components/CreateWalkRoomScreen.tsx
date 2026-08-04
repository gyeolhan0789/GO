import { useState } from 'react';
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

import { useFriendsQuery } from '../../../features/friend/hooks/useFriendsQuery';
import { useCreateRoomMutation } from '../../../features/room/hooks/useCreateRoomMutation';
import { useInviteToRoomMutation } from '../../../features/room/hooks/useInviteToRoomMutation';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Screen } from '../../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl/SegmentedControl';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { FriendSelectRow } from './FriendSelectRow';
import { lineHeights, MAX_FONT_SCALE } from '../../../shared/constants/typography';

type BoardSizeOption = '3' | '4' | '5';
type RoomModeOption = 'COOPERATE' | 'BATTLE';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

const MODE_OPTIONS: { label: string; value: RoomModeOption }[] = [
  { label: '함께 걷기', value: 'COOPERATE' },
  { label: '대결', value: 'BATTLE' },
];

/** 대결은 정확히 두 명이다(GameMode.BATTLE의 정원). */
const BATTLE_OPPONENT_COUNT = 1;

/**
 * 한 판에서 나올 수 있는 빙고 줄 수의 최대치 — 가로 n, 세로 n, 대각선 2.
 * 서버도 같은 식으로 검증해서 넘기면 BINGO_TARGET_COUNT_INVALID가 난다.
 */
function maxBingoLines(boardSize: number): number {
  return 2 * boardSize + 2;
}

type CreateWalkRoomScreenProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateWalkRoomScreen({
  visible,
  onClose,
  onCreated,
}: CreateWalkRoomScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<RoomModeOption>('COOPERATE');
  const [roomName, setRoomName] = useState('');
  const [stepGoal, setStepGoal] = useState('');
  const [bingoGoal, setBingoGoal] = useState('1');
  const [boardSize, setBoardSize] = useState<BoardSizeOption>('4');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [friendSearch, setFriendSearch] = useState('');

  const isBattle = mode === 'BATTLE';

  const friendsQuery = useFriendsQuery();
  const friends = friendsQuery.data?.content ?? [];
  const normalizedSearch = friendSearch.trim().toLowerCase();
  const filteredFriends = normalizedSearch
    ? friends.filter(friend =>
        friend.nickname.toLowerCase().includes(normalizedSearch),
      )
    : friends;
  const createRoomMutation = useCreateRoomMutation();
  const inviteMutation = useInviteToRoomMutation();

  const toggleFriend = (memberId: number) => {
    setSelectedFriendIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      }
      // 대결은 두 명이라 고를 수 있는 상대도 하나뿐이다. 여럿을 고르게 두면
      // 초대가 나간 뒤 정원 초과로 거절당해 되돌리기 어렵다.
      return isBattle ? [memberId] : [...prev, memberId];
    });
  };

  const resetForm = () => {
    setStep(1);
    setMode('COOPERATE');
    setRoomName('');
    setStepGoal('');
    setBingoGoal('1');
    setBoardSize('4');
    setSelectedFriendIds([]);
    setFriendSearch('');
  };

  const handleModeChange = (next: RoomModeOption) => {
    setMode(next);
    // 대결로 바꾸면 여럿 골라둔 게 정원을 넘는다. 첫 한 명만 남긴다.
    if (next === 'BATTLE') {
      setSelectedFriendIds(prev => prev.slice(0, BATTLE_OPPONENT_COUNT));
    }
  };

  const handleHeaderBackPress = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    onClose();
  };

  const handleNext = () => {
    if (!roomName.trim()) {
      Alert.alert('산책방 이름을 입력해주세요.');
      return;
    }
    if (isBattle) {
      const goal = Number(bingoGoal);
      const maximum = maxBingoLines(Number(boardSize));
      if (!bingoGoal || goal < 1 || goal > maximum) {
        Alert.alert(
          '목표 빙고 줄 수를 확인해주세요.',
          `${boardSize} x ${boardSize} 판에서는 1줄부터 ${maximum}줄까지 정할 수 있어요.`,
        );
        return;
      }
    } else if (!stepGoal || Number(stepGoal) < 1) {
      Alert.alert('공동 목표 걸음수를 입력해주세요.');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (isBattle && selectedFriendIds.length !== BATTLE_OPPONENT_COUNT) {
      Alert.alert('대결할 친구를 한 명 선택해주세요.');
      return;
    }

    try {
      const room = await createRoomMutation.mutateAsync({
        name: roomName.trim(),
        mode,
        boardSize: Number(boardSize) as 3 | 4 | 5,
        targetBingoCount: isBattle ? Number(bingoGoal) : Number(boardSize),
        // 대결에 targetStepCount를 실으면 서버가 400으로 막는다.
        ...(isBattle ? {} : { targetStepCount: Number(stepGoal) }),
      });

      // 초대는 친구 한 명당 별도 API라 순차로 보낸다. 하나가 실패해도 나머지는
      // 계속 보내고, 실패한 친구만 모아서 알려준다.
      const failedNicknames: string[] = [];
      for (const memberId of selectedFriendIds) {
        try {
          await inviteMutation.mutateAsync({
            roomId: room.roomId,
            inviteeId: memberId,
          });
        } catch {
          const friend = friends.find(item => item.memberId === memberId);
          failedNicknames.push(friend?.nickname ?? String(memberId));
        }
      }

      if (failedNicknames.length > 0) {
        Alert.alert(
          '일부 초대 실패',
          `${failedNicknames.join(', ')}님에게 초대를 보내지 못했어요.`,
        );
      }

      resetForm();
      onCreated();
    } catch (error) {
      Alert.alert(
        '산책방 생성 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    }
  };

  const isSubmitting = createRoomMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleHeaderBackPress}
    >
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={handleHeaderBackPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={step === 2 ? '이전 단계' : '닫기'}
          >
            <Ionicons
              name={step === 2 ? 'chevron-back' : 'close'}
              size={24}
              color={colors.ink}
            />
          </Pressable>
          <AppText style={styles.headerTitle}>
            {step === 1
              ? isBattle
                ? '대결방 만들기'
                : '모임방 만들기'
              : isBattle
              ? '상대 고르기'
              : '친구 추가'}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <>
              <AppText style={styles.label}>방식</AppText>
              <SegmentedControl
                options={MODE_OPTIONS}
                value={mode}
                onChange={handleModeChange}
              />
              <AppText style={styles.modeHint}>
                {isBattle
                  ? '둘이서 각자 빙고판을 받아, 목표 줄 수에 먼저 닿는 쪽이 이겨요.'
                  : '여럿이 한 빙고판을 함께 채우고 걸음수를 모아요.'}
              </AppText>

              <AppText style={styles.label}>산책방명</AppText>
              <TextInput
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={styles.input}
                placeholder="산책방 이름을 입력하세요"
                placeholderTextColor={colors.muted}
                value={roomName}
                onChangeText={setRoomName}
              />

              {isBattle ? (
                <>
                  <AppText style={styles.label}>목표 빙고 줄 수</AppText>
                  <TextInput
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                    style={styles.input}
                    placeholder={`1 ~ ${maxBingoLines(Number(boardSize))}`}
                    placeholderTextColor={colors.muted}
                    value={bingoGoal}
                    onChangeText={text =>
                      setBingoGoal(text.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <>
                  <AppText style={styles.label}>공동 목표 걸음수</AppText>
                  <TextInput
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                    style={styles.input}
                    placeholder="일주일 기준 목표 걸음수 (예: 10000)"
                    placeholderTextColor={colors.muted}
                    value={stepGoal}
                    onChangeText={text =>
                      setStepGoal(text.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                  />
                </>
              )}

              <AppText style={styles.label}>빙고 크기</AppText>
              <SegmentedControl
                options={BOARD_SIZE_OPTIONS}
                value={boardSize}
                onChange={setBoardSize}
              />
            </>
          ) : (
            <>
              {friends.length > 0 ? (
                <TextInput
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.friendSearchInput}
                  placeholder="이름으로 검색"
                  placeholderTextColor={colors.muted}
                  value={friendSearch}
                  onChangeText={setFriendSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : null}
              {friendsQuery.isLoading ? (
                <AppText style={styles.helperText}>친구 목록을 불러오는 중...</AppText>
              ) : friends.length === 0 ? (
                <AppText style={styles.helperText}>추가할 친구가 없어요.</AppText>
              ) : filteredFriends.length === 0 ? (
                <AppText style={styles.helperText}>검색 결과가 없어요.</AppText>
              ) : (
                <View>
                  {filteredFriends.map(friend => (
                    <FriendSelectRow
                      key={friend.memberId}
                      friend={friend}
                      selected={selectedFriendIds.includes(friend.memberId)}
                      onPress={() => toggleFriend(friend.memberId)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 1 ? (
            <Pressable
              onPress={handleNext}
              style={styles.submitButton}
              accessibilityRole="button"
              accessibilityLabel="다음"
            >
              <AppText style={styles.submitButtonText}>다음</AppText>
            </Pressable>
          ) : (
            <>
              <AppText style={styles.selectedCount}>
                {selectedFriendIds.length > 0
                  ? isBattle
                    ? `${
                        friends.find(
                          friend => friend.memberId === selectedFriendIds[0],
                        )?.nickname ?? ''
                      }님과 대결`
                    : `${selectedFriendIds.length}명 선택됨`
                  : isBattle
                  ? '대결할 친구를 한 명 골라주세요'
                  : '선택된 친구 없음'}
              </AppText>
              <Pressable
                onPress={handleCreate}
                disabled={isSubmitting}
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="산책방 만들기"
              >
                <AppText style={styles.submitButtonText}>
                  {isSubmitting ? '만드는 중...' : '만들기'}
                </AppText>
              </Pressable>
            </>
          )}
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
    fontFamily: 'BMDOHYEON',
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
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modeHint: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.sm,
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
  friendSearchInput: {
    height: controlHeight.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    // TextInput에는 lineHeight를 주지 않는다(안드로이드에서 글자가 밀린다).
    // font padding을 끄고 한 줄 입력이라 세로 가운데로 맞춘다.
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  selectedCount: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  helperText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  submitButton: {
    height: controlHeight.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.surface,
  },
});

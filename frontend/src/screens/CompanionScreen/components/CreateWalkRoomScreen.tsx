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
import { WalkRoomCreatedModal } from './WalkRoomCreatedModal';
import { lineHeights, MAX_FONT_SCALE } from '../../../shared/constants/typography';

type BoardSizeOption = '3' | '4' | '5';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

/** 만들기가 끝난 뒤 완료 모달이 가리킬 방. */
type CreatedRoom = {
  roomId: number;
  name: string;
};

type CreateWalkRoomScreenProps = {
  visible: boolean;
  onClose: () => void;
  /** 방을 만들고 목록으로 돌아갈 때. */
  onCreated: () => void;
  /** 방을 만들고 바로 그 방으로 들어갈 때. */
  onOpenCreatedRoom: (roomId: number) => void;
};

export function CreateWalkRoomScreen({
  visible,
  onClose,
  onCreated,
  onOpenCreatedRoom,
}: CreateWalkRoomScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [roomName, setRoomName] = useState('');
  const [stepGoal, setStepGoal] = useState('');
  const [boardSize, setBoardSize] = useState<BoardSizeOption>('4');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  // 만들어진 방. null이면 완료 모달이 닫혀 있다.
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);

  // 이 화면은 닫혀 있어도 계속 마운트돼 있어 그냥 두면 동행 탭에 처음 들어온
  // 순간의 친구 목록을 계속 보여준다. 상대가 내 친구 요청을 수락해도 내 쪽에는
  // 알림이 없으니, 모달을 열 때마다 다시 읽어 새로 맺어진 친구를 놓치지 않는다.
  const friendsQuery = useFriendsQuery({ enabled: visible });
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
    setSelectedFriendIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId],
    );
  };

  const resetForm = () => {
    setStep(1);
    setRoomName('');
    setStepGoal('');
    setBoardSize('4');
    setSelectedFriendIds([]);
    setFriendSearch('');
    setCreatedRoom(null);
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
    if (!stepGoal || Number(stepGoal) < 1) {
      Alert.alert('공동 목표 걸음수를 입력해주세요.');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    try {
      const room = await createRoomMutation.mutateAsync({
        name: roomName.trim(),
        mode: 'COOPERATE',
        boardSize: Number(boardSize) as 3 | 4 | 5,
        targetBingoCount: Number(boardSize),
        targetStepCount: Number(stepGoal),
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

      // 폼은 완료 모달을 닫을 때 비운다 — 여기서 비우면 모달 뒤로 빈 1단계가 보인다.
      setCreatedRoom({ roomId: room.roomId, name: room.name });
    } catch (error) {
      Alert.alert(
        '산책방 생성 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    }
  };

  const isSubmitting = createRoomMutation.isPending;

  // 완료 모달의 두 갈래. 어느 쪽이든 이 화면은 닫히고 폼은 처음 상태로 돌아간다.
  const handleCloseCreated = () => {
    resetForm();
    onCreated();
  };

  const handleViewCreated = (roomId: number) => {
    resetForm();
    onOpenCreatedRoom(roomId);
  };

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
            {step === 1 ? '모임방 만들기' : '친구 추가'}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <>
              <AppText style={styles.label}>산책방명</AppText>
              <TextInput
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={styles.input}
                placeholder="산책방 이름을 입력하세요"
                placeholderTextColor={colors.muted}
                value={roomName}
                onChangeText={setRoomName}
              />

              <AppText style={styles.label}>공동 목표 걸음수</AppText>
              <TextInput
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={styles.input}
                placeholder="일주일 기준 목표 걸음수 (예: 10000)"
                placeholderTextColor={colors.muted}
                value={stepGoal}
                onChangeText={text => setStepGoal(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

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
                  ? `${selectedFriendIds.length}명 선택됨`
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

        {/* 이 화면 안에 두어 만들기 모달이 닫히는 전환과 겹치지 않게 한다. */}
        <WalkRoomCreatedModal
          visible={createdRoom !== null}
          roomName={createdRoom?.name ?? ''}
          onClose={handleCloseCreated}
          onView={() =>
            createdRoom ? handleViewCreated(createdRoom.roomId) : undefined
          }
        />
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

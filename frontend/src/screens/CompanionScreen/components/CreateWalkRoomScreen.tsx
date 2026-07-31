import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useFriendsQuery } from '../../../features/friend/hooks/useFriendsQuery';
import { useCreateRoomMutation } from '../../../features/room/hooks/useCreateRoomMutation';
import { useInviteToRoomMutation } from '../../../features/room/hooks/useInviteToRoomMutation';
import { Screen } from '../../../shared/components/Screen/Screen';
import { SegmentedControl } from '../../../shared/components/SegmentedControl/SegmentedControl';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { FriendSelectRow } from './FriendSelectRow';

type BoardSizeOption = '3' | '4' | '5';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

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
  const [roomName, setRoomName] = useState('');
  const [stepGoal, setStepGoal] = useState('');
  const [boardSize, setBoardSize] = useState<BoardSizeOption>('4');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [friendSearch, setFriendSearch] = useState('');

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
  };

  const handleHeaderBackPress = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    onClose();
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
          <Text style={styles.headerTitle}>
            {step === 1 ? '모임방 만들기' : '친구 추가'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <>
              <Text style={styles.label}>산책방명</Text>
              <TextInput
                style={styles.input}
                placeholder="산책방 이름을 입력하세요"
                placeholderTextColor={colors.muted}
                value={roomName}
                onChangeText={setRoomName}
              />

              <Text style={styles.label}>공동 목표 걸음수</Text>
              <TextInput
                style={styles.input}
                placeholder="일주일 기준 목표 걸음수 (예: 10000)"
                placeholderTextColor={colors.muted}
                value={stepGoal}
                onChangeText={text => setStepGoal(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>빙고 크기</Text>
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
                <Text style={styles.helperText}>친구 목록을 불러오는 중...</Text>
              ) : friends.length === 0 ? (
                <Text style={styles.helperText}>추가할 친구가 없어요.</Text>
              ) : filteredFriends.length === 0 ? (
                <Text style={styles.helperText}>검색 결과가 없어요.</Text>
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
              onPress={() => setStep(2)}
              style={styles.submitButton}
              accessibilityRole="button"
              accessibilityLabel="다음"
            >
              <Text style={styles.submitButtonText}>다음</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.selectedCount}>
                {selectedFriendIds.length > 0
                  ? `${selectedFriendIds.length}명 선택됨`
                  : '선택된 친구 없음'}
              </Text>
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
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '만드는 중...' : '만들기'}
                </Text>
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
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  friendSearchInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  selectedCount: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  helperText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.ink,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  submitButton: {
    height: 52,
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
    color: colors.surface,
  },
});

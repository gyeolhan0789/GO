import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCreateRoomMutation } from '../../../features/room/hooks/useCreateRoomMutation';
import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { Button } from '../../../shared/components/Button/Button';
import { SegmentedControl } from '../../../shared/components/SegmentedControl/SegmentedControl';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type BoardSizeOption = '3' | '4' | '5';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

// TODO: 목표 빙고 수를 고르는 UI가 아직 없다. 값이 정해지기 전까지는 최소값
// (1줄 완성)으로 보낸다.
const DEFAULT_TARGET_BINGO_COUNT = 1;

type CreateSoloWalkSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (roomId: number) => void;
  /** 게임방명으로 그대로 보낸다. */
  nickname: string;
};

export function CreateSoloWalkSheet({
  visible,
  onClose,
  onCreated,
  nickname,
}: CreateSoloWalkSheetProps) {
  const [boardSize, setBoardSize] = useState<BoardSizeOption>('4');
  const [stepGoal, setStepGoal] = useState('');
  const createRoomMutation = useCreateRoomMutation();

  const handleStart = async () => {
    const targetStepCount = Number(stepGoal);
    if (!stepGoal || targetStepCount < 1) {
      Alert.alert('목표 걸음수를 입력해주세요.');
      return;
    }

    try {
      // SINGLE 모드는 서버가 알아서 처리한다: 이미 진행 중인 솔로 방이 있으면
      // 그 방을 그대로 반환하고, 없으면 새로 만들어 바로 시작한다.
      const room = await createRoomMutation.mutateAsync({
        name: nickname,
        mode: 'SINGLE',
        boardSize: Number(boardSize) as 3 | 4 | 5,
        targetBingoCount: DEFAULT_TARGET_BINGO_COUNT,
        targetStepCount,
      });
      onCreated(room.roomId);
    } catch (error) {
      Alert.alert(
        '산책 시작 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    }
  };

  const isSubmitting = createRoomMutation.isPending;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="혼자 산책하기">
      <View style={styles.body}>
        <Text style={styles.label}>목표 걸음수</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 10000"
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
      </View>
      <Button
        label={isSubmitting ? '시작하는 중...' : '시작하기'}
        size="lg"
        disabled={isSubmitting}
        onPress={handleStart}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
});

import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { useRenewBingoBoardMutation } from '../../hooks/useRenewBingoBoardMutation';
import { BottomSheet } from '../../../../shared/components/BottomSheet/BottomSheet';
import { Button } from '../../../../shared/components/Button/Button';
import { SegmentedControl } from '../../../../shared/components/SegmentedControl/SegmentedControl';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import { fontFamily } from '../../../../shared/constants/typography';

type BoardSizeOption = '3' | '4' | '5';

const BOARD_SIZE_OPTIONS: { label: string; value: BoardSizeOption }[] = [
  { label: '3 x 3', value: '3' },
  { label: '4 x 4', value: '4' },
  { label: '5 x 5', value: '5' },
];

type BoardRenewalSheetProps = {
  visible: boolean;
  onClose: () => void;
  onRenewed: (roomId: number) => void;
  roomId: number;
  currentTargetStepCount: number | null;
  currentBoardSize: number;
};

/** 빙고판을 다 채웠거나 일주일이 지나 갱신이 필요할 때, 방장이 다음 주
 * 목표 걸음수·빙고 크기를 다시 정하는 시트. 솔로 모드에서는 방장이
 * 본인 한 명뿐이라 갱신이 곧 재입장 조건이고, 협동 모드에서는 방장만 이
 * 시트를 볼 수 있다(팀원은 방장이 끝낼 때까지 대기 문구만 본다). */
export function BoardRenewalSheet({
  visible,
  onClose,
  onRenewed,
  roomId,
  currentTargetStepCount,
  currentBoardSize,
}: BoardRenewalSheetProps) {
  const [boardSize, setBoardSize] = useState<BoardSizeOption>('4');
  const [stepGoal, setStepGoal] = useState('');
  const renewBoardMutation = useRenewBingoBoardMutation();

  // 시트 자체는 계속 마운트돼 있어 visible이 바뀔 때마다 지금 값으로
  // 다시 채운다.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setBoardSize(String(currentBoardSize) as BoardSizeOption);
    setStepGoal(currentTargetStepCount ? String(currentTargetStepCount) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleRenew = async () => {
    const targetStepCount = Number(stepGoal);
    if (!stepGoal || targetStepCount < 1) {
      Alert.alert('이번 주 목표 걸음 수를 입력해주세요.');
      return;
    }

    try {
      await renewBoardMutation.mutateAsync({
        roomId,
        boardSize: Number(boardSize),
        targetStepCount,
      });
      onRenewed(roomId);
    } catch (error) {
      Alert.alert(
        '빙고판 갱신 실패',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    }
  };

  const isSubmitting = renewBoardMutation.isPending;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="빙고판 갱신하기">
      <View style={styles.body}>
        <Text style={styles.label}>이번 주 목표 걸음 수</Text>
        <TextInput
          style={styles.input}
          placeholder="이번 주 합계 (예: 10000)"
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
        label={isSubmitting ? '갱신하는 중...' : '갱신하기'}
        size="lg"
        disabled={isSubmitting}
        onPress={handleRenew}
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

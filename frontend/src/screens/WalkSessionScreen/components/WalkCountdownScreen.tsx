import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { fontFamily } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';

const COUNTDOWN_VALUES = ['3', '2', '1'];
const STEP_DURATION_MS = 1000;

type WalkCountdownScreenProps = {
  onFinish: () => void;
};

/** 산책 화면 진입과 동시에 바로 지도가 보이면 어색해서, 지도를 아예
 * 가리는 전체 화면으로 짧게 카운트다운을 보여준 뒤 넘어간다. 탭하면 바로
 * 건너뛴다. */
export function WalkCountdownScreen({ onFinish }: WalkCountdownScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const isFinished = stepIndex >= COUNTDOWN_VALUES.length;

  useEffect(() => {
    if (isFinished) {
      onFinish();
      return;
    }
    const timer = setTimeout(() => setStepIndex(index => index + 1), STEP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [stepIndex, isFinished, onFinish]);

  if (isFinished) {
    return null;
  }

  return (
    <Pressable
      style={styles.screen}
      onPress={onFinish}
      accessibilityRole="button"
      accessibilityLabel="카운트다운 건너뛰기"
    >
      <Text style={styles.countdownText}>{COUNTDOWN_VALUES[stepIndex]}</Text>
      <Text style={styles.hintText}>탭하면 바로 시작해요</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontFamily: fontFamily.bold,
    fontSize: 120,
    color: colors.surface,
  },
  hintText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.surface,
    opacity: 0.6,
    marginTop: spacing.md,
  },
});

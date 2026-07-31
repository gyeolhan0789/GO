import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { fontFamily } from '../../../shared/constants/typography';

const COUNTDOWN_VALUES = ['3', '2', '1'];
const STEP_DURATION_MS = 700;

type WalkCountdownOverlayProps = {
  onFinish: () => void;
};

/** 산책 화면 진입과 동시에 바로 지도가 보이면 어색해서, 짧게 숫자
 * 카운트다운을 보여준 뒤 넘어간다. 탭하면 바로 건너뛴다. */
export function WalkCountdownOverlay({ onFinish }: WalkCountdownOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const isFinished = stepIndex >= COUNTDOWN_VALUES.length;

  useEffect(() => {
    if (isFinished) {
      onFinish();
      return;
    }
    const timer = setTimeout(() => setStepIndex(index => index + 1), STEP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isFinished, onFinish]);

  if (isFinished) {
    return null;
  }

  return (
    <Pressable
      style={styles.overlay}
      onPress={onFinish}
      accessibilityRole="button"
      accessibilityLabel="카운트다운 건너뛰기"
    >
      <Text style={styles.countdownText}>{COUNTDOWN_VALUES[stepIndex]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontFamily: fontFamily.bold,
    fontSize: 96,
    color: colors.surface,
  },
});

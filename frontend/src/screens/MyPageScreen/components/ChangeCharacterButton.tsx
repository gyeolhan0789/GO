import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type ChangeCharacterButtonProps = {
  onPress: () => void;
};

const HEIGHT = 44;

export function ChangeCharacterButton({ onPress }: ChangeCharacterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="캐릭터 변경하기"
    >
      <Text style={styles.label}>캐릭터 변경하기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: HEIGHT,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    // 미리보기 하단 모서리에 살짝 걸쳐 앉는다(디자인 시안과 동일).
    marginTop: -HEIGHT / 24,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.surface,
  },
});

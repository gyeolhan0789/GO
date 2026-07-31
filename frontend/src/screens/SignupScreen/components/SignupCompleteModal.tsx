import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import {
  bodyFont,
  lineHeights,
  textStyles,
} from '../../../shared/constants/typography';

type SignupCompleteModalProps = {
  visible: boolean;
  /** 확인을 누르면 로그인 화면으로 돌아간다. */
  onConfirm: () => void;
};

const BADGE_SIZE = 64;
const CHECK_SIZE = 36;

export function SignupCompleteModal({
  visible,
  onConfirm,
}: SignupCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // 가입은 이미 끝났고 앞으로 갈 길이 하나뿐이라 배경 탭으로는 닫지 않는다.
      // 안드로이드 뒤로가기도 확인과 같은 곳으로 보낸다.
      onRequestClose={onConfirm}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialogWrapper} accessibilityViewIsModal>
          <View style={styles.shadowBox} />
          <View style={styles.dialog}>
            <View style={styles.badge}>
              <Ionicons
                name="checkmark"
                size={CHECK_SIZE}
                color={colors.successText}
              />
            </View>

            <AppText style={styles.title}>회원가입 완료</AppText>
            <AppText style={styles.message}>
              이제 로그인하고 산책을 시작해보세요!
            </AppText>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="회원가입 완료 확인"
            >
              <AppText style={styles.actionLabel}>로그인하러 가기</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  dialogWrapper: {
    // alignSelf: 'stretch'는 backdrop의 alignItems: 'center'를 덮어써서 화면이
    // 넓을 때 다이얼로그가 왼쪽으로 붙는다. 정렬은 부모에게 맡긴다.
    width: '100%',
    maxWidth: 320,
    paddingRight: shadow.offset,
    paddingBottom: shadow.offset,
  },
  shadowBox: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  dialog: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    marginBottom: spacing.xs,
  },
  title: {
    ...textStyles.heading2,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.inkMuted,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    height: controlHeight.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  actionLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.surface,
  },
});

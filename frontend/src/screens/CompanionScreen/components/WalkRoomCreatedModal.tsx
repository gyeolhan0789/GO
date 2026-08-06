import { Modal, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Button } from '../../../shared/components/Button/Button';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import {
  bodyFont,
  lineHeights,
  textStyles,
} from '../../../shared/constants/typography';

type WalkRoomCreatedModalProps = {
  visible: boolean;
  /** 방금 만든 방 이름. 어떤 방이 생겼는지 확인해주는 값이다. */
  roomName: string;
  /** 바로 방으로 들어갈 때. */
  onView: () => void;
  /** 목록으로 돌아갈 때. 안드로이드 뒤로가기도 여기로 온다. */
  onClose: () => void;
};

const BADGE_SIZE = 64;
const CHECK_SIZE = 36;

/**
 * 산책방 생성 완료.
 *
 * 만든 직후에 할 일은 방에 들어가 친구와 목표를 확인하는 것이라, 토스트로 알리고
 * 목록에서 방을 다시 찾게 하는 대신 바로 들어갈 길을 함께 준다.
 */
export function WalkRoomCreatedModal({
  visible,
  roomName,
  onView,
  onClose,
}: WalkRoomCreatedModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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

            <AppText style={styles.title}>산책방이 만들어졌어요!</AppText>
            <AppText style={styles.roomName} numberOfLines={2}>
              {roomName}
            </AppText>
            {/* 닫아도 방이 사라지지 않는다는 걸 알려준다 — 그래야 '닫기'를 고를 수 있다. */}
            <AppText style={styles.hint}>
              목록에서 언제든 다시 열 수 있어요.
            </AppText>

            <View style={styles.actions}>
              <Button
                label="닫기"
                variant="secondary"
                onPress={onClose}
                accessibilityLabel="닫기"
                style={styles.action}
              />
              <Button
                label="보러가기"
                onPress={onView}
                accessibilityLabel="보러가기"
                style={styles.action}
              />
            </View>
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
    gap: spacing.xs,
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
  roomName: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    textAlign: 'center',
  },
  hint: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
  },
});

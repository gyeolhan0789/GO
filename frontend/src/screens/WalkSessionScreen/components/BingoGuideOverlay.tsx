import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Button } from '../../../shared/components/Button/Button';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type BingoGuideOverlayProps = {
  visible: boolean;
  /** 안내를 닫을 때. 다시 뜨지 않게 봤다고 기록하는 것도 호출부가 맡는다. */
  onDismiss: () => void;
};

/**
 * 산책 화면의 빙고판 버튼이 어디 있는지 처음 한 번 짚어주는 안내.
 *
 * 빙고판은 산책 중 미션을 인증하는 유일한 길인데, 지도가 화면을 채워서 상단
 * 오른쪽 작은 아이콘이 눈에 안 들어온다. 그래서 화면을 덮어 그 버튼만 밝게
 * 남기고 바로 아래에 설명을 붙인다.
 *
 * 실제 버튼은 덮개 아래에 깔리므로 같은 자리에 같은 모양을 한 번 더 그린다
 * (WalkSessionScreen의 topBar·iconButton과 같은 규격). 버튼을 오려내려면 마스크가
 * 필요한데, 그러기엔 얻는 게 적다.
 */
export function BingoGuideOverlay({
  visible,
  onDismiss,
}: BingoGuideOverlayProps) {
  const insets = useSafeAreaInsets();

  // 실제 버튼 자리. Screen이 top 인셋을 패딩으로 주고, topBar가 그 아래로
  // paddingTop: spacing.sm에서 시작한다.
  const buttonTop = insets.top + spacing.sm;
  const buttonRight = spacing.lg;
  const calloutTop = buttonTop + BUTTON_SIZE + RING_PADDING * 2 + spacing.sm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      {/* 안내는 읽고 넘기는 것뿐이라 어디를 눌러도 닫힌다. */}
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="빙고판 안내 닫기"
      >
        <View style={styles.content} accessibilityViewIsModal>
          <View
            style={[
              styles.ring,
              {
                top: buttonTop - RING_PADDING,
                right: buttonRight - RING_PADDING,
              },
            ]}
          >
            <View style={styles.button}>
              <Ionicons name="grid-outline" size={20} color={colors.ink} />
            </View>
          </View>

          <View style={[styles.callout, { top: calloutTop }]}>
            <AppText style={styles.title}>빙고판은 여기 있어요</AppText>
            <AppText style={styles.body}>
              걷는 동안 이 버튼으로 빙고판을 열어 미션을 확인하고 사진으로 인증할
              수 있어요.
            </AppText>
            <Button
              label="알겠어요"
              onPress={onDismiss}
              accessibilityLabel="빙고판 안내 확인"
              style={styles.action}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// WalkSessionScreen의 iconButton과 같은 크기여야 덮개 위 사본이 어긋나지 않는다.
const BUTTON_SIZE = 40;
// 밝은 테두리를 두를 여유. 어두운 덮개 위에서 버튼을 도드라지게 한다.
const RING_PADDING = 6;
// 말풍선을 화면 양옆에서 띄우는 거리.
const CALLOUT_INSET = spacing.md;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
  },
  content: {
    flex: 1,
  },
  ring: {
    position: 'absolute',
    padding: RING_PADDING,
    borderRadius: radius.md + RING_PADDING,
    backgroundColor: colors.primary,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    position: 'absolute',
    right: CALLOUT_INSET,
    left: CALLOUT_INSET,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  body: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
  },
  action: {
    marginTop: spacing.sm,
    // 공용 Button은 오프셋 그림자를 바깥으로 그린다. 말풍선 안에서 잘리지 않게 여유를 둔다.
    marginRight: shadow.offset,
    marginBottom: shadow.offset,
  },
});

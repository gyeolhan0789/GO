import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { FriendResponse } from '../../../features/friend/api/friendApi';
import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { resolveMenuLeft } from '../../../shared/components/Select/resolveMenuLeft';
import { colors } from '../../../shared/constants/colors';
import { controlHeight } from '../../../shared/constants/sizing';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights } from '../../../shared/constants/typography';

type FriendCardProps = {
  friend: FriendResponse;
  onDelete: () => void;
};

const MENU_WIDTH = 120;
const MENU_ICON_SIZE = 20;
// 측정 전 잠깐 보일 수 있는 폴백 위치(트리거가 대략 있을 법한 높이).
const FALLBACK_MENU_TOP = 120;

export function FriendCard({ friend, onDelete }: FriendCardProps) {
  const triggerRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, triggerWidth, height) => {
      setAnchor({
        top: y + height + spacing.xs,
        left: resolveMenuLeft({
          triggerX: x,
          triggerWidth,
          menuWidth: MENU_WIDTH,
          screenWidth,
        }),
      });
    });
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setAnchor(null);
  };

  return (
    <View style={styles.wrapper}>
      <Card style={styles.card}>
        <MemberAvatar
          gender={friend.gender}
          defaultImageUrl={friend.defaultImageUrl}
          equippedItems={friend.equippedItems}
          style={styles.avatar}
        />
        <View style={styles.textGroup}>
          <AppText style={styles.name} numberOfLines={1}>
            {friend.nickname}
          </AppText>
          <AppText style={styles.subtitle} numberOfLines={1}>
            이번 주 {friend.weeklySteps}보
          </AppText>
        </View>
        <Pressable
          ref={triggerRef}
          onPress={openMenu}
          hitSlop={8}
          style={styles.menuTrigger}
          accessibilityRole="button"
          accessibilityLabel={`${friend.nickname} 친구 메뉴`}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={MENU_ICON_SIZE}
            color={colors.muted}
          />
        </Pressable>
      </Card>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View
            style={[
              styles.menu,
              anchor && styles.menuAnchored,
              anchor && { top: anchor.top, left: anchor.left },
            ]}
          >
            <Pressable
              onPress={() => {
                closeMenu();
                onDelete();
              }}
              style={styles.menuOption}
              accessibilityRole="menuitem"
              accessibilityLabel={`${friend.nickname} 친구 삭제`}
            >
              <AppText style={styles.menuOptionText}>친구 삭제</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // 카드 우측 오프셋 그림자(shadow.offset)가 리스트 폭 안에서 잘리지 않도록
    // 오른쪽에 그만큼 여백을 남긴다.
    alignSelf: 'stretch',
    marginRight: shadow.offset,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // 원 테두리 디자인은 CharacterBust가 모든 화면 공통으로 그린다.
  avatar: {
    width: 48,
    height: 48,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  menuTrigger: {
    padding: spacing.xs,
  },
  overlay: {
    flex: 1,
    // 측정 전 폴백 위치.
    alignItems: 'flex-end',
    paddingTop: FALLBACK_MENU_TOP,
    paddingHorizontal: spacing.lg,
  },
  menuAnchored: {
    position: 'absolute',
  },
  menu: {
    width: MENU_WIDTH,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  menuOption: {
    justifyContent: 'center',
    height: controlHeight.row,
    paddingHorizontal: spacing.md,
  },
  menuOptionText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.danger,
  },
});

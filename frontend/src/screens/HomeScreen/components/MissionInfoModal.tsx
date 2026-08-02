import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { BingoMissionResponse } from '../../../features/bingo/api/bingoApi';
import {
  MISSION_TYPE_ICONS,
  MISSION_TYPE_LABELS,
  MISSION_TYPE_POINTS,
} from '../../../features/bingo/model/missionType';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

type MissionInfoModalProps = {
  /** null이면 닫힌 상태. */
  mission: BingoMissionResponse | null;
  onClose: () => void;
};

const ICON_SIZE = 40;

export function MissionInfoModal({ mission, onClose }: MissionInfoModalProps) {
  return (
    <Modal
      visible={mission !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="미션 정보 닫기"
        />

        {mission ? (
          <View style={styles.dialogWrapper}>
            <View style={styles.shadowBox} />
            <View style={styles.dialog}>
              {mission.missionImageUrl ? (
                <Image
                  source={{ uri: mission.missionImageUrl }}
                  style={styles.missionImage}
                />
              ) : (
                <Ionicons
                  name={MISSION_TYPE_ICONS[mission.type]}
                  size={ICON_SIZE}
                  color={colors.ink}
                />
              )}

              <AppText style={styles.title}>{mission.title}</AppText>

              <View style={styles.metaRow}>
                <AppText style={styles.type}>
                  {MISSION_TYPE_LABELS[mission.type]} 미션
                </AppText>
                <View style={styles.pointBadge}>
                  <AppText style={styles.pointBadgeText}>
                    +{MISSION_TYPE_POINTS[mission.type]}P
                  </AppText>
                </View>
              </View>

              <AppText style={styles.detail}>{mission.detail}</AppText>
            </View>
          </View>
        ) : null}
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
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  dialog: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  missionImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.sm,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.ink,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  type: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
  },
  pointBadge: {
    backgroundColor: colors.highlightSoftBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pointBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.highlightText,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.8,
    textAlign: 'center',
  },
});

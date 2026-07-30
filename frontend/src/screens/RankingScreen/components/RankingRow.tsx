import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { formatThousands } from '../../../features/history/model/format';
import type { RankingItem } from '../../../features/ranking/api/rankingApi';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { ME_LABEL } from '../model';

type RankingRowProps = {
  item: RankingItem;
  /** 내 줄은 목록에서 바로 찾을 수 있게 강조한다. */
  isMe: boolean;
};

const AVATAR_SIZE = 44;
const AVATAR_ICON_SIZE = 24;
const STEP_ICON_SIZE = 14;

const ACCENT_WIDTH = 4;
const ACCENT_INSET = 6;

export function RankingRow({ item, isMe }: RankingRowProps) {
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {/* 절대 배치라 다른 줄과 내용 시작점이 어긋나지 않는다. */}
      {isMe ? <View style={styles.meAccent} /> : null}

      <Text style={[styles.rank, isMe && styles.rankMe]}>{item.rank}</Text>

      {/* TODO: 서버가 회원별 캐릭터 이미지를 내려주면 아바타로 바꾼다. */}
      <View style={[styles.avatar, isMe && styles.avatarMe]}>
        <Ionicons
          name="person"
          size={AVATAR_ICON_SIZE}
          color={isMe ? colors.successText : colors.mutedStrong}
        />
      </View>

      <Text
        style={[styles.nickname, isMe && styles.nicknameMe]}
        numberOfLines={1}
      >
        {isMe ? ME_LABEL : item.nickname}
      </Text>

      <View style={styles.steps}>
        <Ionicons
          name="footsteps"
          size={STEP_ICON_SIZE}
          color={isMe ? colors.successText : colors.ink}
        />
        <Text style={[styles.stepsLabel, isMe && styles.stepsLabelMe]}>
          {formatThousands(item.weeklySteps)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  rowMe: {
    backgroundColor: colors.successBg,
  },
  meAccent: {
    position: 'absolute',
    left: 0,
    top: ACCENT_INSET,
    bottom: ACCENT_INSET,
    width: ACCENT_WIDTH,
    borderRadius: ACCENT_WIDTH / 2,
    backgroundColor: colors.primary,
  },
  rank: {
    minWidth: 20,
    textAlign: 'center',
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  rankMe: {
    color: colors.successText,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
  },
  avatarMe: {
    backgroundColor: colors.surface,
  },
  nickname: {
    flex: 1,
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    color: colors.ink,
  },
  nicknameMe: {
    color: colors.successText,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsLabel: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    color: colors.ink,
  },
  stepsLabelMe: {
    color: colors.successText,
  },
});

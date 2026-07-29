import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { formatThousands } from '../../../features/history/model/format';
import type { RankingItem } from '../../../features/ranking/api/rankingApi';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type RankingRowProps = {
  item: RankingItem;
  /** 내 줄은 목록에서 바로 찾을 수 있게 강조한다. */
  isMe: boolean;
};

const AVATAR_SIZE = 44;
const AVATAR_ICON_SIZE = 24;
const STEP_ICON_SIZE = 14;

const ME_LABEL = '나';

export function RankingRow({ item, isMe }: RankingRowProps) {
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <Text style={styles.rank}>{item.rank}</Text>

      {/* TODO: 서버가 회원별 캐릭터 이미지를 내려주면 아바타로 바꾼다. */}
      <View style={styles.avatar}>
        <Ionicons
          name="person"
          size={AVATAR_ICON_SIZE}
          color={colors.mutedStrong}
        />
      </View>

      <Text style={styles.nickname} numberOfLines={1}>
        {isMe ? ME_LABEL : item.nickname}
      </Text>

      <View style={styles.steps}>
        <Ionicons
          name="footsteps"
          size={STEP_ICON_SIZE}
          color={colors.mutedStrong}
        />
        <Text style={styles.stepsLabel}>
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
  rank: {
    minWidth: 20,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.mutedStrong,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
  },
  nickname: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.ink,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.primary,
  },
});

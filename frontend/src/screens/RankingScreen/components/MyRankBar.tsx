import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { formatThousands } from '../../../features/history/model/format';
import { CharacterLayers } from '../../../features/member/components/CharacterLayers';
import type { Character } from '../../../features/member/model/character';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../../features/member/model/equippedItems';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { ME_LABEL } from '../model';

type MyRankBarProps = {
  /** 서버가 매긴 내 순위(`myRank`). 집계에 못 들었으면 0 이하로 온다. */
  rank: number;
  weeklySteps: number;
  /** 내 캐릭터. 회원 조회가 아직이면 없다. */
  character?: Character;
};

const AVATAR_SIZE = 36;
const STEP_ICON_SIZE = 14;

/** 순위가 안 잡히면 숫자 대신 이걸 둔다. 0위라고 적히는 게 더 이상하다. */
const UNRANKED_LABEL = '-';

/**
 * 순위가 목록 밖일 때 화면 아래에 붙여두는 내 순위 줄.
 *
 * 목록과 달리 어두운 면으로 깔아 스크롤되는 줄과 구분한다.
 */
export function MyRankBar({ rank, weeklySteps, character }: MyRankBarProps) {
  const isRanked = rank > 0;
  // 내 캐릭터는 회원 조회로 알고 있다. 랭킹 응답의 착용 아이템을 쓸 필요가 없다.
  const layers = selectLayerItems(
    toEquippedByCategory(character?.equippedItems ?? []),
  );

  return (
    <View
      style={styles.bar}
      accessibilityLabel={
        isRanked
          ? `내 순위 ${rank}위, ${formatThousands(weeklySteps)}보`
          : `순위 밖, ${formatThousands(weeklySteps)}보`
      }
    >
      <Text style={styles.rank}>{isRanked ? rank : UNRANKED_LABEL}</Text>

      <CharacterLayers
        baseImage={character?.baseImage ?? null}
        items={layers}
        style={styles.avatar}
      />

      <Text style={styles.label}>{ME_LABEL}</Text>

      <View style={styles.steps}>
        <Ionicons
          name="footsteps"
          size={STEP_ICON_SIZE}
          color={colors.surface}
        />
        <Text style={styles.stepsLabel}>{formatThousands(weeklySteps)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  rank: {
    minWidth: 20,
    textAlign: 'center',
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 15,
    color: colors.surface,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    // 레이어가 절대 배치라 상자를 넘는 부분을 잘라야 원형이 유지된다.
    overflow: 'hidden',
    backgroundColor: colors.mutedStrong,
  },
  label: {
    flex: 1,
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    color: colors.surface,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsLabel: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 16,
    color: colors.primarySoftLight,
  },
});

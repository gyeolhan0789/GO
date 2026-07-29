import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

// TODO: 서버가 회원별 캐릭터를 내려주면 이 자리채움 에셋을 걷어낸다.
import characterMale from '../../HomeScreen/assets/character-male.png';
import type { RankingItem } from '../../../features/ranking/api/rankingApi';
import { formatThousands } from '../../../features/history/model/format';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type PodiumCardProps = {
  /** 왼쪽부터 그릴 세 자리(2위 · 1위 · 3위). 빈 자리는 null. */
  places: (RankingItem | null)[];
};

// 메달 색은 시상대에서만 쓰고 다른 곳에 재사용할 일이 없어 여기 둔다.
const MEDAL_COLOR: Record<number, string> = {
  1: colors.highlightBg,
  2: '#D9DDE3',
  3: '#C4813F',
};

// 1등이 가장 높다. 블록 아래쪽을 맞춰 세우면 높이 차이가 등수로 읽힌다.
const BLOCK_HEIGHT: Record<number, number> = { 1: 84, 2: 60, 3: 46 };

const STAND_HEIGHT = 150;
const CHARACTER_SIZE = 66;
const STEP_ICON_SIZE = 13;

export function PodiumCard({ places }: PodiumCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {places.map((place, index) =>
          place ? (
            <Place key={place.memberId} place={place} />
          ) : (
            <View key={`empty-${index}`} style={styles.place} />
          ),
        )}
      </View>
    </Card>
  );
}

function Place({ place }: { place: RankingItem }) {
  const isFirst = place.rank === 1;

  return (
    <View style={styles.place}>
      <View style={styles.stand}>
        <Image
          source={characterMale}
          style={styles.character}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <View
          style={[
            styles.block,
            {
              height: BLOCK_HEIGHT[place.rank],
              backgroundColor: MEDAL_COLOR[place.rank],
            },
          ]}
        >
          <Text style={styles.blockRank}>{place.rank}</Text>
        </View>
      </View>

      <Text style={styles.nickname} numberOfLines={1}>
        {place.nickname}
      </Text>

      <View style={styles.steps}>
        <Ionicons
          name="footsteps"
          size={STEP_ICON_SIZE}
          color={colors.mutedStrong}
        />
        <Text style={[styles.stepsLabel, isFirst && styles.stepsLabelFirst]}>
          {formatThousands(place.weeklySteps)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  place: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  // 블록 높이가 달라도 이름 줄이 나란히 서도록 상자 높이를 고정한다.
  stand: {
    height: STAND_HEIGHT,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  character: {
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
  },
  block: {
    alignSelf: 'stretch',
    // 세 칸이 서로 붙어 하나의 단처럼 보이도록 여백을 아주 좁게만 준다.
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
  },
  blockRank: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.surface,
  },
  nickname: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  stepsLabelFirst: {
    color: colors.primary,
  },
});

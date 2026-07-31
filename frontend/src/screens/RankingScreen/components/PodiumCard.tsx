import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { RankingItem } from '../../../features/ranking/api/rankingApi';
import { formatThousands } from '../../../features/history/model/format';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import { ME_LABEL } from '../model';
import { RankingAvatar } from './RankingAvatar';

type PodiumCardProps = {
  /** 왼쪽부터 그릴 세 자리(2위 · 1위 · 3위). 빈 자리는 null. */
  places: (RankingItem | null)[];
  /** 시상대에 오른 사람이 나인지 가리는 기준. 모르면 아무도 강조하지 않는다. */
  myNickname?: string;
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
const CHARACTER_SIZE = 96;
const STEP_ICON_SIZE = 13;

/**
 * 캐릭터 발끝 아래로 남는 빈 여백. 512 캔버스에서 발끝이 y≈415라 아래 97px이
 * 투명하고, `contain`으로 줄여도 이 비율은 그대로다. 그만큼 끌어내려야 캐릭터가
 * 단을 밟고 선 것처럼 보인다.
 */
const CHARACTER_FOOT_GAP = Math.round(CHARACTER_SIZE * ((512 - 415) / 512));

export function PodiumCard({ places, myNickname }: PodiumCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {places.map((place, index) =>
          place ? (
            <Place
              key={place.memberId}
              place={place}
              isMe={place.nickname === myNickname}
            />
          ) : (
            <View key={`empty-${index}`} style={styles.place} />
          ),
        )}
      </View>
    </Card>
  );
}

function Place({ place, isMe }: { place: RankingItem; isMe: boolean }) {
  return (
    <View style={styles.place}>
      <View style={styles.stand}>
        <RankingAvatar
          gender={place.gender}
          defaultImageUrl={place.defaultImageUrl}
          equippedItems={place.equippedItems}
          style={styles.character}
          variant="full"
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
          <AppText style={styles.blockRank}>{place.rank}</AppText>
        </View>
      </View>

      <AppText
        style={[styles.nickname, isMe && styles.nicknameMe]}
        numberOfLines={1}
      >
        {isMe ? ME_LABEL : place.nickname}
      </AppText>

      <View style={styles.steps}>
        <Ionicons name="footsteps" size={STEP_ICON_SIZE} color={colors.ink} />
        <AppText style={styles.stepsLabel}>
          {formatThousands(place.weeklySteps)}
        </AppText>
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
    // 빈 여백만큼 블록을 끌어올려 발끝이 단에 닿게 한다.
    marginBottom: -CHARACTER_FOOT_GAP,
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
    fontFamily: bodyFont.bold,
    fontSize: 20,
    color: colors.surface,
    lineHeight: lineHeights[20],
  },
  nickname: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20,
  },
  nicknameMe: {
    color: colors.primary,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    color: colors.ink,
    lineHeight: lineHeights[14],
  },
});

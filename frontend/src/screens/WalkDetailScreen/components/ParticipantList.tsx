import { StyleSheet, View } from 'react-native';

import type { WalkDetailParticipant } from '../../../features/history/types';
import { CharacterBust } from '../../../features/member/components/CharacterBust';
import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { useMyCharacterQuery } from '../../../features/member/hooks/useMyCharacterQuery';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../../features/member/model/equippedItems';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type ParticipantListProps = {
  participants: WalkDetailParticipant[];
};

const AVATAR_SIZE = 72;

/** 함께 걸은 사람들. 보여주기만 한다. */
export function ParticipantList({ participants }: ParticipantListProps) {
  // 산책 상세가 이미 내 캐릭터를 조회하므로(useWalkDetailQuery) 캐시에서 온다.
  const character = useMyCharacterQuery();
  const myLayers = selectLayerItems(
    toEquippedByCategory(character.data?.equippedItems ?? []),
  );

  return (
    <Card>
      <AppText style={styles.heading}>함께한 친구</AppText>

      <View style={styles.row}>
        {participants.map(participant => (
          <View key={participant.memberId} style={styles.participant}>
            {participant.isMe ? (
              <CharacterBust
                baseImage={character.data?.baseImage ?? null}
                fallbackImage={character.data?.baseImageFallback ?? null}
                items={myLayers}
                style={styles.avatar}
              />
            ) : (
              <MemberAvatar
                gender={participant.gender}
                defaultImageUrl={participant.defaultImageUrl}
                equippedItems={participant.equippedItems}
                style={styles.avatar}
              />
            )}
            <AppText style={styles.name} numberOfLines={1}>
              {participant.isMe ? '나' : participant.nickname}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  participant: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  // 랭킹 줄과 같은 원형 흉상 자리. 흉상 자르기는 CharacterBust(overflow)가 한다.
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  name: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
  },
  missionCount: {
    fontFamily: bodyFont.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.4,
  },
});

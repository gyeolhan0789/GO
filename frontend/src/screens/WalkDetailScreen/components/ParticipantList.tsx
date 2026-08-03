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
  // 원 테두리 디자인은 CharacterBust가 모든 화면 공통으로 그린다.
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
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

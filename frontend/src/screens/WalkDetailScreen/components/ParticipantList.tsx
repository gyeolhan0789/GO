import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { WalkDetailParticipant } from '../../../features/history/types';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type ParticipantListProps = {
  participants: WalkDetailParticipant[];
};

const AVATAR_SIZE = 72;
const PLACEHOLDER_ICON_SIZE = 32;

/** 함께 걸은 사람들. 보여주기만 한다. */
export function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <Card>
      <AppText style={styles.heading}>함께한 친구</AppText>

      <View style={styles.row}>
        {participants.map(participant => (
          <View key={participant.memberId} style={styles.participant}>
            <View style={styles.avatar}>
              {/* TODO: 백엔드가 캐릭터 이미지를 내려주면 채워진다. */}
              <Ionicons
                name="person"
                size={PLACEHOLDER_ICON_SIZE}
                color={colors.primarySoft}
              />
            </View>
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
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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

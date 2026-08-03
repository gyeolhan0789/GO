import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { AppText } from '../../../shared/components/AppText/AppText';
import { AvatarStack } from '../../../shared/components/AvatarStack/AvatarStack';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card } from '../../../shared/components/Card/Card';
import { ProgressBar } from '../../../shared/components/ProgressBar/ProgressBar';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import type { MyWalkRoom } from '../types';
import { lineHeights } from '../../../shared/constants/typography';

type WalkRoomCardProps = {
  room: MyWalkRoom;
  onPress: () => void;
};

export function WalkRoomCard({ room, onPress }: WalkRoomCardProps) {
  const subtitle =
    room.mode === 'group'
      ? `이번 주 빙고 ${room.bingoCompleted}/${room.bingoTotal} · 멤버 ${room.memberCount}명`
      : `이번 주 빙고 ${room.bingoCompleted}/${room.bingoTotal}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card>
        <View style={styles.headerRow}>
          {room.mode === 'group' ? (
            <AvatarStack
              members={(room.members ?? []).map(member => ({
                id: String(member.memberId),
                avatar: (
                  <MemberAvatar
                    gender={member.gender}
                    defaultImageUrl={member.defaultImageUrl}
                    equippedItems={member.equippedItems}
                    style={styles.memberAvatar}
                  />
                ),
              }))}
              size={40}
            />
          ) : (
            <View style={styles.soloIcon}>
              <Ionicons name="walk" size={20} color={colors.successText} />
            </View>
          )}

          <View style={styles.textGroup}>
            <View style={styles.titleRow}>
              <AppText style={styles.title} numberOfLines={1}>
                {room.name}
              </AppText>
              <Badge
                label={room.mode === 'group' ? '함께' : '혼자'}
                variant={room.mode === 'group' ? 'success' : 'info'}
                labelStyle={styles.dohyeonText}
              />
            </View>
            <AppText style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </AppText>
            {room.scheduleLabel ? (
              <View style={styles.scheduleRow}>
                <Ionicons name="time-outline" size={12} color={colors.ink} />
                <AppText style={styles.scheduleText} numberOfLines={1}>
                  {room.scheduleLabel}
                </AppText>
              </View>
            ) : null}
            <ProgressBar progress={room.bingoCompleted / room.bingoTotal} />
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // 카드 우측 오프셋 그림자(shadow.offset)가 리스트 폭 안에서 잘리지 않도록
    // 오른쪽에 그만큼 여백을 남긴다.
    alignSelf: 'stretch',
    marginRight: shadow.offset,
  },
  pressed: {
    opacity: 0.85,
  },
  dohyeonText: {
    fontFamily: 'BMDOHYEON',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  soloIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // AvatarStack이 만든 원을 흉상이 꽉 채운다. 자르기는 원(overflow: hidden)이 한다.
  memberAvatar: {
    width: '100%',
    height: '100%',
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
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
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    flexShrink: 1,
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});

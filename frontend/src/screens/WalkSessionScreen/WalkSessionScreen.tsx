import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
import { endWalkSession } from '../../features/walk-session/model/walkSessionStore';
import { Button } from '../../shared/components/Button/Button';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors, participantColors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { shadow } from '../../shared/constants/shadow';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily } from '../../shared/constants/typography';
import { WalkRouteMap } from './components/WalkRouteMap';
import { useRouteTracking } from './hooks/useRouteTracking';

// TODO: 방/걸음수/이동 경로 실제 API 연동 전까지의 임시 목업 데이터.
const MOCK_ROOM = {
  name: '주말 산책러들',
  targetSteps: 10000,
  myCalories: 128,
  myDistanceKm: 2.7,
};

// 팀원별 오늘 걸음 수. 팀 목표 진행바/범례는 이 목록에서 바로 계산한다
// (teamSteps를 따로 하드코딩하면 합계가 어긋날 수 있어서).
const MOCK_TEAM_MEMBERS = [
  { id: 'me', nickname: '나', steps: 3200, color: participantColors[0] },
  { id: 'p2', nickname: '지민', steps: 1200, color: participantColors[1] },
  { id: 'p3', nickname: '하은', steps: 800, color: participantColors[2] },
  { id: 'p4', nickname: '준호', steps: 500, color: participantColors[3] },
];

function formatElapsed(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type WalkSessionNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'WalkSession'
>;

export function WalkSessionScreen() {
  const navigation = useNavigation<WalkSessionNavigation>();
  const insets = useSafeAreaInsets();
  // 화면 마운트와 무관하게 시작 시각 기준으로 계산되는 경과 시간/일시정지
  // 상태. 뒤로가기로 나갔다 들어와도 0으로 리셋되지 않는다.
  const { elapsedSeconds, isPaused, togglePause } = useWalkSession();
  // 일시정지하면 경로도 같이 멈춘다. 지금까지 찍은 좌표는 그대로 남는다.
  const route = useRouteTracking(!isPaused);

  const teamSteps = MOCK_TEAM_MEMBERS.reduce((sum, member) => sum + member.steps, 0);
  const mySteps = MOCK_TEAM_MEMBERS.find(member => member.id === 'me')?.steps ?? 0;
  const remainingSteps = Math.max(0, MOCK_ROOM.targetSteps - teamSteps);
  const stepSegments = MOCK_TEAM_MEMBERS.map(member => ({
    value: member.steps,
    color: member.color,
  }));

  const handleEndWalk = useCallback(() => {
    Alert.alert('산책 종료', '지금 산책을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: () => {
          // TODO: 실제 산책 종료/방 나가기(DELETE /rooms/{roomId}/members/me) 연동.
          // 그때 경과 시간(useWalkSession의 elapsedSeconds)을 운동시간으로 같이 보낸다.
          endWalkSession();
          navigation.goBack();
        },
      },
    ]);
  }, [navigation]);

  return (
    <Screen edges={['top']}>
      {/* 전체 화면 배경으로 쓰는 이동 경로 지도. */}
      <View style={styles.mapArea}>
        <WalkRouteMap route={route} />
      </View>

      <View style={styles.topBar}>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.roomBadge}>
          <Ionicons name="people" size={16} color={colors.successText} />
          <Text style={styles.roomBadgeText}>{MOCK_ROOM.name}</Text>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.navigate('BingoBoard')}
          accessibilityRole="button"
          accessibilityLabel="팀 빙고 보기"
        >
          <Ionicons name="grid-outline" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.elapsedBadge}>
        <Text style={styles.elapsedText}>{formatElapsed(elapsedSeconds)}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionLabel}>이번 산책 팀 목표</Text>
        <View style={styles.teamGoalRow}>
          <Text style={styles.teamGoalValue}>{teamSteps.toLocaleString()}</Text>
          <Text style={styles.teamGoalTarget}>
            {' '}
            / {MOCK_ROOM.targetSteps.toLocaleString()}보
          </Text>
        </View>
        <MemberProgressBar segments={stepSegments} total={MOCK_ROOM.targetSteps} />
        <Text style={styles.remainingText}>
          {remainingSteps.toLocaleString()}보 남았어요
        </Text>

        <View style={styles.memberLegendRow}>
          {MOCK_TEAM_MEMBERS.map(member => (
            <View key={member.id} style={styles.memberLegendItem}>
              <View
                style={[styles.memberDot, { backgroundColor: member.color }]}
              />
              <Text style={styles.memberName}>{member.nickname}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>오늘 걸음</Text>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              {mySteps.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>칼로리</Text>
            <Text style={styles.statValue}>{MOCK_ROOM.myCalories}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>거리</Text>
            <Text style={styles.statValue}>
              {MOCK_ROOM.myDistanceKm}
              <Text style={styles.statUnit}>km</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.panelFooter, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.footerRow}>
            <View style={styles.pauseButtonWrapper}>
              <View style={styles.pauseButtonShadow} />
              <Pressable
                style={styles.pauseButton}
                onPress={togglePause}
                accessibilityRole="button"
                accessibilityLabel={isPaused ? '재개' : '일시정지'}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={20}
                  color={colors.ink}
                />
              </Pressable>
            </View>
            <Button
              label="산책 종료"
              size="lg"
              onPress={handleEndWalk}
              style={styles.endButton}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.neutralBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  roomBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.successText,
  },
  elapsedBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  elapsedText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.6,
  },
  teamGoalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  teamGoalValue: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    color: colors.ink,
  },
  teamGoalTarget: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  remainingText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  memberLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  memberLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  memberName: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.neutralBg,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.6,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.ink,
  },
  statValueAccent: {
    color: colors.successText,
  },
  statUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.6,
  },
  panelFooter: {
    paddingTop: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // 산책 종료 버튼(Button, size="lg")과 세로폭을 맞추려고 정사각형 한 변을
  // 그 높이(68)에 맞춘다. 그림자 박스도 Button 컴포넌트와 같은 방식(어긋난
  // 잉크색 사각형)으로 넣어 톤을 맞춘다.
  pauseButtonWrapper: {
    position: 'relative',
    marginRight: shadow.offset,
  },
  pauseButtonShadow: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  pauseButton: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    flex: 1,
  },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
import { endWalkSession } from '../../features/walk-session/model/walkSessionStore';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors, participantColors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { shadow } from '../../shared/constants/shadow';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { WalkRouteMap, type WalkRouteMapHandle } from './components/WalkRouteMap';
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// 패널을 아래로 끌어내려도 손잡이만큼은 항상 남겨서, 다시 끌어올릴 자리를
// 확보한다.
const COLLAPSED_PANEL_HEIGHT = 40;

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
  const { route, initialCoords } = useRouteTracking(!isPaused);
  const mapRef = useRef<WalkRouteMapHandle>(null);
  // 현위치 버튼을 패널의 현재 노출 높이 바로 위에 띄우려면 패널의 실측
  // 높이가 필요하다(콘텐츠에 따라 늘어나서 고정값을 쓸 수 없다). 패널을
  // 끌어서 접고 펴는 동안에도 버튼이 같이 따라오도록 panelTranslateY로
  // 보정한다.
  const [panelHeight, setPanelHeight] = useState(0);
  const handlePanelLayout = useCallback((event: LayoutChangeEvent) => {
    setPanelHeight(event.nativeEvent.layout.height);
  }, []);

  // 패널을 아래로 끌어내리면 지도가 넓어지고(현위치 버튼으로 이동한 지점이
  // 패널에 가려지지 않는다), 다시 끌어올리면 원래 정보 패널로 돌아온다.
  // 접혔을 때 손잡이가 기기 하단 제스처 바/내비게이션 바 밑으로 숨어서
  // 다시 못 끌어올리는 일이 없도록, 안전 영역(insets.bottom)만큼은 항상
  // 손잡이 아래 여백으로 남겨둔다.
  const collapsedPanelHeight = COLLAPSED_PANEL_HEIGHT + insets.bottom;
  const panelTranslateY = useRef(new Animated.Value(0)).current;
  const maxTranslateYRef = useRef(0);
  useEffect(() => {
    maxTranslateYRef.current = Math.max(panelHeight - collapsedPanelHeight, 0);
  }, [panelHeight, collapsedPanelHeight]);
  const dragStartValue = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        panelTranslateY.stopAnimation(value => {
          dragStartValue.current = value;
        });
      },
      onPanResponderMove: (_event, gesture) => {
        panelTranslateY.setValue(
          clamp(dragStartValue.current + gesture.dy, 0, maxTranslateYRef.current),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const maxTranslateY = maxTranslateYRef.current;
        const isTap = Math.abs(gesture.dx) < 4 && Math.abs(gesture.dy) < 4;
        let shouldCollapse: boolean;
        if (isTap) {
          // 거의 움직이지 않았으면 탭으로 보고 현재 상태를 토글한다.
          shouldCollapse = dragStartValue.current < maxTranslateY / 2;
        } else {
          const released = clamp(dragStartValue.current + gesture.dy, 0, maxTranslateY);
          // 절반 넘게 내렸거나 빠르게 내리는 중이면 접힌 상태로, 아니면
          // 펼쳐진 상태로 스냅한다.
          shouldCollapse = gesture.vy > 0.5 || released > maxTranslateY / 2;
        }
        Animated.spring(panelTranslateY, {
          toValue: shouldCollapse ? maxTranslateY : 0,
          useNativeDriver: false,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

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
        <WalkRouteMap ref={mapRef} route={route} initialCoords={initialCoords} />
      </View>

      <Animated.View
        style={[
          styles.recenterButtonWrapper,
          {
            bottom: Animated.add(
              Animated.subtract(panelHeight, panelTranslateY),
              spacing.md,
            ),
          },
        ]}
      >
        <Pressable
          style={styles.recenterButton}
          onPress={() => mapRef.current?.recenter()}
          accessibilityRole="button"
          accessibilityLabel="현위치로 이동"
        >
          <Ionicons name="locate" size={20} color={colors.ink} />
        </Pressable>
      </Animated.View>

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
          <AppText style={styles.roomBadgeText}>{MOCK_ROOM.name}</AppText>
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
        <AppText style={styles.elapsedText}>{formatElapsed(elapsedSeconds)}</AppText>
      </View>

      <Animated.View
        style={[
          styles.panel,
          // transform 대신 bottom(레이아웃 속성)으로 움직인다. react-native-maps의
          // MapView는 안드로이드에서 SurfaceView로 그려져 별도 레이어에 합성되는데,
          // 형제 뷰에 transform을 주면 그 뷰도 별도 레이어로 승격되면서 지도보다
          // 아래로 깔려 패널이 안 보이는 문제가 있었다(bottom은 이 문제가 없다).
          { bottom: Animated.multiply(panelTranslateY, -1) },
        ]}
        onLayout={handlePanelLayout}
      >
        <View
          style={styles.dragHandleArea}
          {...panResponder.panHandlers}
          accessibilityRole="button"
          accessibilityLabel="정보 패널 접기/펼치기"
          accessibilityHint="위아래로 끌거나 탭해서 지도를 더 넓게 볼 수 있어요"
        >
          <View style={styles.dragHandle} />
        </View>

        <AppText style={styles.sectionLabel}>이번 산책 팀 목표</AppText>
        <View style={styles.teamGoalRow}>
          <AppText style={styles.teamGoalValue}>{teamSteps.toLocaleString()}</AppText>
          <AppText style={styles.teamGoalTarget}>
            {' '}
            / {MOCK_ROOM.targetSteps.toLocaleString()}보
          </AppText>
        </View>
        <MemberProgressBar segments={stepSegments} total={MOCK_ROOM.targetSteps} />
        <AppText style={styles.remainingText}>
          {remainingSteps.toLocaleString()}보 남았어요
        </AppText>

        <View style={styles.memberLegendRow}>
          {MOCK_TEAM_MEMBERS.map(member => (
            <View key={member.id} style={styles.memberLegendItem}>
              <View
                style={[styles.memberDot, { backgroundColor: member.color }]}
              />
              <AppText style={styles.memberName}>{member.nickname}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <AppText style={styles.statLabel}>오늘 걸음</AppText>
            <AppText style={[styles.statValue, styles.statValueAccent]}>
              {mySteps.toLocaleString()}
            </AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <AppText style={styles.statLabel}>칼로리</AppText>
            <AppText style={styles.statValue}>{MOCK_ROOM.myCalories}</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <AppText style={styles.statLabel}>거리</AppText>
            <AppText style={styles.statValue}>
              {MOCK_ROOM.myDistanceKm}
              <AppText style={styles.statUnit}>km</AppText>
            </AppText>
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
      </Animated.View>
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
    lineHeight: lineHeights[14],
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
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  recenterButtonWrapper: {
    position: 'absolute',
    right: spacing.lg,
  },
  recenterButton: {
    width: 44,
    height: controlHeight.row,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  },
  // 펼친 상태에서도 항상 이 높이만큼만 차지한다(안전 영역 여백은 여기에
  // 넣지 않는다 — 접힘 최대 깊이 계산에서만 쓴다. 안 그러면 펼친 상태에서도
  // 손잡이 위아래로 불필요한 빈 공간이 생긴다).
  dragHandleArea: {
    height: COLLAPSED_PANEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
  },
  sectionLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
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
    lineHeight: lineHeights[30],
    color: colors.ink,
  },
  teamGoalTarget: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    opacity: 0.6,
    marginBottom: 4,
  },
  remainingText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
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
    lineHeight: lineHeights[12],
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
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.ink,
  },
  statValueAccent: {
    color: colors.successText,
  },
  statUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
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
    height: controlHeight.xl,
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

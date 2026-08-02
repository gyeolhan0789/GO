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
import { useFriendsQuery } from '../../features/friend/hooks/useFriendsQuery';
import { todayIso } from '../../features/history/model/period';
import { useHistoriesQuery } from '../../features/history/hooks/useHistoriesQuery';
import { useSaveHistoryMutation } from '../../features/history/hooks/useSaveHistoryMutation';
import { useMyMemberIdQuery } from '../../features/member/hooks/useMyMemberIdQuery';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
import {
  confirmWalkSessionStart,
  endWalkSession,
  setWalkSessionStartHealthSummary,
} from '../../features/walk-session/model/walkSessionStore';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
import { useStepDataToday } from '../../shared/hooks/useStepDataToday';
import { getParticipantColor } from '../../shared/lib/participantColor';
import { radius } from '../../shared/constants/radius';
import { shadow } from '../../shared/constants/shadow';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { WalkCountdownScreen } from './components/WalkCountdownScreen';
import { WalkRouteMap, type WalkRouteMapHandle } from './components/WalkRouteMap';
import { useRouteTracking } from './hooks/useRouteTracking';

/** 산책 중 걸음/거리/칼로리가 화면에서 계속 갱신되도록 다시 읽는 주기. */
const HEALTH_POLL_INTERVAL_MS = 20000;

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
  // 상태. 뒤로가기로 나갔다 들어와도 0으로 리셋되지 않는다. isStarted가
  // false인 동안은 카운트다운이 아직 안 끝난 것이라 경과 시간이 0으로
  // 고정된다.
  const { roomId, startHealthSummary, elapsedSeconds, isPaused, isStarted, togglePause } =
    useWalkSession();
  // 카운트다운이 끝나야 진짜 시작이므로, 그 전까지는 경로도 기록하지 않는다.
  const showCountdown = !isStarted;
  // 일시정지하면 경로도 같이 멈춘다. 지금까지 찍은 좌표는 그대로 남는다.
  const { route, initialCoords } = useRouteTracking(isStarted && !isPaused);

  const roomQuery = useRoomDetailQuery(roomId);
  const room = roomQuery.data ?? null;
  const members = room?.members ?? [];
  // 방 목표 걸음수는 "이번 주" 단위라 주간 누적으로 비교한다.
  const weeklyStepsQuery = useHistoriesQuery('WEEK', todayIso(), {
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    enabled: !isPaused,
  });
  const weeklySteps = weeklyStepsQuery.data?.totalStep ?? 0;
  const targetStepCount = room?.targetStepCount ?? null;

  // 팀원별 걸음수를 직접 내려주는 API는 아직 없어서, 이미 있는 친구 목록
  // API(친구별 이번 주 걸음수 포함)로 대신한다. 이 목록은 "나(로그인한 사람)의
  // 친구"라서, 방을 만든 사람이 자기 친구들을 초대해 방 멤버가 곧 자기 친구
  // 목록과 겹치는 방장 시점에서만 정확하다 — 방장이 아닌 멤버가 볼 때는
  // 다른 멤버가 나와 친구가 아닐 수 있어(방장의 친구일 뿐) 그 사람 걸음수는
  // 0으로 보일 수 있다. 제대로 하려면 "이 방 멤버들의 걸음수"를 직접 내려주는
  // 백엔드 엔드포인트가 필요하다(현재 memberHistoryRepository는 임의의
  // memberId 목록을 이미 받을 수 있어 서비스단만 추가하면 됨) — 지금은 범위
  // 밖이라 남겨둔다.
  const friendsQuery = useFriendsQuery({
    enabled: room !== null && room.mode !== 'SINGLE',
  });
  const myMemberIdQuery = useMyMemberIdQuery();
  const weeklyStepsByMemberId = new Map(
    (friendsQuery.data?.content ?? []).map(friend => [
      friend.memberId,
      friend.weeklySteps,
    ]),
  );
  const stepSegments = members.map(member => ({
    value:
      member.memberId === myMemberIdQuery.data
        ? weeklySteps
        : weeklyStepsByMemberId.get(member.memberId) ?? 0,
    color: getParticipantColor(member.memberId, myMemberIdQuery.data ?? null, members),
  }));
  const teamWeeklySteps = stepSegments.reduce(
    (sum, segment) => sum + segment.value,
    0,
  );
  const remainingSteps =
    targetStepCount !== null
      ? Math.max(0, targetStepCount - teamWeeklySteps)
      : 0;
  const weeklyPercent =
    targetStepCount !== null
      ? Math.min(100, Math.round((teamWeeklySteps / targetStepCount) * 100))
      : 0;

  // 걷는 동안 화면에 뜬 값이 계속 갱신되도록 주기적으로 다시 읽는다. 일시정지
  // 중에는(경로 추적도 같이 멈추는 것과 동일하게) 다시 읽지 않고 멈춘
  // 시점 값을 그대로 보여준다.
  const health = useStepDataToday({
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    enabled: !isPaused,
  });
  const healthSummary =
    health.data?.status === 'ok' ? health.data.summary : null;
  // 이 폴링에서 처음 성공한 값을 세션 걸음 기준값으로 등록한다(한 번
  // 등록되면 store가 이후 호출을 무시한다). 단발성 조회 대신 이미 도는
  // 폴링에 얹어서, 첫 시도가 실패해도 다음 폴링 때 자연히 재시도된다.
  useEffect(() => {
    if (isStarted && startHealthSummary === null && healthSummary) {
      setWalkSessionStartHealthSummary(healthSummary);
    }
  }, [isStarted, startHealthSummary, healthSummary]);
  // 오늘 누적치에서 세션 시작 시점 기준값을 빼서 "이 산책에서" 걷고 쓴
  // 양만 보여준다. 기준값을 아직 못 읽었으면(권한 문제 등) 0을 빼는 셈이라
  // 오늘 누적치가 그대로 나온다.
  const sessionSteps = healthSummary
    ? Math.max(0, healthSummary.steps - (startHealthSummary?.steps ?? 0))
    : 0;
  const sessionDistanceKm = healthSummary
    ? Math.round(
        Math.max(
          0,
          healthSummary.distanceMeters - (startHealthSummary?.distanceMeters ?? 0),
        ) / 100,
      ) / 10
    : 0;
  const sessionCalories = healthSummary
    ? Math.round(
        Math.max(
          0,
          healthSummary.activeCalories - (startHealthSummary?.activeCalories ?? 0),
        ),
      )
    : 0;
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

  const saveHistoryMutation = useSaveHistoryMutation();

  const handleEndWalk = useCallback(() => {
    Alert.alert('산책 종료', '지금 산책을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: async () => {
          // 방은 파괴하지 않는 한 계속 유지된다. 빙고판 갱신은 다 채웠거나
          // 일주일이 지났을 때 방장이 직접 트리거해야 한다(자동 초기화 없음).
          // 여기서는 이 화면의 로컬 세션(경과 시간 타이머)만 끝낸다.
          // TODO: 홈 화면의 빙고판 쿼리(useActiveBingoBoardQuery)도 함께
          // 무효화/refetch해서 산책 중 인증한 미션이 홈 화면 미리보기에 바로
          // 반영되게 한다.
          if (roomId === null) {
            endWalkSession();
            navigation.goBack();
            return;
          }

          // 오늘 걸음/거리/칼로리를 서버에 올린다. 실패해도 이 세션 자체를
          // 못 끝내게 막을 이유는 없어서(내 기기에서 이미 다 계산해둔
          // 값이라 결과 화면은 그대로 보여줄 수 있다), 실패는 알림만 띄우고
          // 계속 진행한다.
          try {
            await saveHistoryMutation.mutateAsync({
              historyDate: todayIso(),
              step: sessionSteps,
              distance: Math.round(sessionDistanceKm * 1000),
              calories: sessionCalories,
            });
          } catch (error) {
            Alert.alert(
              '기록 저장에 실패했어요',
              error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
            );
          }

          const resultParams = {
            roomId,
            roomName: room?.name ?? '',
            mode: room?.mode ?? ('SINGLE' as const),
            steps: sessionSteps,
            distanceKm: sessionDistanceKm,
            calories: sessionCalories,
            elapsedSeconds,
          };
          endWalkSession();
          navigation.replace('WalkResult', resultParams);
        },
      },
    ]);
  }, [
    navigation,
    roomId,
    room,
    sessionSteps,
    sessionDistanceKm,
    sessionCalories,
    elapsedSeconds,
    saveHistoryMutation,
  ]);

  // 카운트다운이 끝나기 전까지는 지도를 아예 안 띄운다(지도가 살짝
  // 비치는 오버레이보다 완전히 가려진 화면이 낫다는 판단).
  if (showCountdown) {
    return (
      <Screen edges={['top', 'bottom']}>
        <WalkCountdownScreen onFinish={confirmWalkSessionStart} />
      </Screen>
    );
  }

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
          <Ionicons
            name={room?.mode === 'SINGLE' ? 'walk' : 'people'}
            size={16}
            color={colors.successText}
          />
          <AppText style={styles.roomBadgeText}>{room?.name ?? ''}</AppText>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => roomId !== null && navigation.navigate('BingoBoard', { roomId })}
          accessibilityRole="button"
          accessibilityLabel={room?.mode === 'SINGLE' ? '빙고판 보기' : '팀 빙고 보기'}
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

        <AppText style={styles.sessionTitle}>이번 산책</AppText>
        <View style={styles.sessionStatsRow}>
          <View style={styles.sessionPrimaryStat}>
            <AppText style={styles.sessionPrimaryValue}>
              {sessionSteps.toLocaleString()}
            </AppText>
            <AppText style={styles.sessionPrimaryUnit}>보</AppText>
          </View>
          <View style={styles.sessionSecondaryStats}>
            <View style={styles.sessionSecondaryStat}>
              <AppText style={styles.sessionSecondaryValue}>
                {sessionCalories}
                <AppText style={styles.sessionSecondaryUnit}> kcal</AppText>
              </AppText>
              <AppText style={styles.sessionSecondaryLabel}>소모 칼로리</AppText>
            </View>
            <View style={styles.sessionSecondaryStat}>
              <AppText style={styles.sessionSecondaryValue}>
                {sessionDistanceKm}
                <AppText style={styles.sessionSecondaryUnit}> km</AppText>
              </AppText>
              <AppText style={styles.sessionSecondaryLabel}>이동 거리</AppText>
            </View>
          </View>
        </View>

        {targetStepCount !== null ? (
          <>
            <View style={styles.dividerDotted} />
            <View style={styles.weeklyHeaderRow}>
              <View style={styles.weeklyLabelRow}>
                <Ionicons name="flag" size={16} color={colors.primary} />
                <AppText style={styles.weeklyLabel}>
                  이번 주 {teamWeeklySteps.toLocaleString()}보
                </AppText>
              </View>
              <AppText style={styles.weeklyTarget}>
                목표 {targetStepCount.toLocaleString()}보
              </AppText>
            </View>
            <MemberProgressBar segments={stepSegments} total={targetStepCount} />
            <AppText style={styles.weeklyCaption}>
              {remainingSteps > 0
                ? `${weeklyPercent}% 달성 · ${remainingSteps.toLocaleString()}보 남음`
                : '이번 주 목표를 달성했어요!'}
            </AppText>
            {members.length > 1 ? (
              <View style={styles.legendRow}>
                {members.map(member => (
                  <View key={member.memberId} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor: getParticipantColor(
                            member.memberId,
                            myMemberIdQuery.data ?? null,
                            members,
                          ),
                        },
                      ]}
                    />
                    <AppText style={styles.legendText}>{member.nickname}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

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
  sessionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sessionPrimaryStat: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  sessionPrimaryValue: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: lineHeights[30],
    color: colors.primary,
  },
  sessionPrimaryUnit: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.primary,
    marginBottom: 4,
  },
  sessionSecondaryStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  sessionSecondaryStat: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sessionSecondaryValue: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.ink,
  },
  sessionSecondaryUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  sessionSecondaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  dividerDotted: {
    borderTopWidth: 1,
    borderStyle: 'dotted',
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  weeklyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weeklyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weeklyLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  weeklyTarget: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
  },
  weeklyCaption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  legendText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.7,
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

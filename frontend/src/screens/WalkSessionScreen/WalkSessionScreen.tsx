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
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { useFriendsQuery } from '../../features/friend/hooks/useFriendsQuery';
import { todayIso } from '../../features/history/model/period';
import { useHistoriesQuery } from '../../features/history/hooks/useHistoriesQuery';
import { useMyMemberIdQuery } from '../../features/member/hooks/useMyMemberIdQuery';
import { useMyPageQuery } from '../../features/member/hooks/useMyPageQuery';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
import { recordFinishedWalk } from '../../features/walk-session/model/recordFinishedWalk';
import {
  clearWalkSessionEndRequest,
  confirmWalkSessionStart,
  endWalkSession,
  stopWalkSession,
} from '../../features/walk-session/model/walkSessionStore';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
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
  const {
    roomId,
    elapsedSeconds,
    isPaused,
    isStarted,
    steps,
    distanceMeters,
    calories,
    isEndRequested,
    togglePause,
  } = useWalkSession();
  // 종료 처리 중(stopWalkSession이 네이티브 세션을 끝내면 isStarted가 먼저
  // false가 된다)에는 카운트다운을 다시 보여주면 안 된다 — 화면을 벗어나기
  // 전까지 이 화면을 그대로 유지한다.
  const isEndingRef = useRef(false);
  // 카운트다운이 끝나야 진짜 시작이므로, 그 전까지는 경로도 기록하지 않는다.
  const showCountdown = !isStarted && !isEndingRef.current;
  // GPS 추적·일시정지는 네이티브 세션 상태가 그대로 반영하므로 이 훅은
  // 파라미터가 필요 없다.
  const { route, initialCoords } = useRouteTracking();
  const myPageQuery = useMyPageQuery();

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

  // 걸음수·거리·칼로리는 네이티브 세션이 직접 집계해서 내려준다(20초 간격
  // 갱신, 일시정지 중에는 고정). 화면 표시용으로 반올림만 한다.
  const sessionSteps = Math.round(steps);
  const sessionDistanceKm = Math.round(distanceMeters / 100) / 10;
  const sessionCalories = Math.round(calories);
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

  const queryClient = useQueryClient();

  /** 확인을 마친 뒤의 실제 종료. 워치에서 종료를 눌렀을 때도 여기로 온다
   * (확인은 워치 화면에서 이미 받는다). */
  const finishWalk = useCallback(async () => {
    // stopWalkSession이 네이티브 세션을 끝내면 isStarted가 곧바로 false가
    // 되는데, 그 뒤로도 기록 저장 등 비동기 작업이 남아있어 이 화면이 한동안
    // 더 떠있는다 — 그 사이 카운트다운이 다시 뜨지 않도록 미리 표시해둔다.
    isEndingRef.current = true;

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

    // 네이티브 세션을 종료해 서비스·알림·GPS를 정지시키고 확정된
    // 최종 수치를 받아온다. 여기서부터는 되돌릴 수 없으므로 이 수치를
    // 끝까지 들고 간다.
    const final = await stopWalkSession();
    const finalSteps = Math.round(final.steps);
    const finalDistanceMeters = Math.round(final.distanceMeters);
    const finalCalories = Math.round(final.calories);
    // 서버는 이 값이 (종료 - 시작)보다 크면 요청을 거절한다. 올리지 않는다.
    const finalElapsedSeconds = Math.floor(final.activeElapsedMs / 1000);

    // 종료 시각은 여기서 한 번만 찍는다. 재시도할 때마다 새로 찍으면 산책
    // 시간이 그만큼 늘어난다.
    const outcome = await recordFinishedWalk({
      roomId,
      endedAt: new Date(),
      activeDurationSeconds: finalElapsedSeconds,
      step: finalSteps,
      distance: finalDistanceMeters,
      calories: finalCalories,
    });

    // 올리지 못해도 이 산책을 못 끝내게 막을 이유는 없다 — 수치는 이미 기기에서
    // 확정됐고 결과 화면은 그대로 보여줄 수 있다.
    if (outcome.status === 'failed') {
      Alert.alert('기록 저장에 실패했어요', outcome.message);
    } else if (outcome.status === 'stepsOnly') {
      Alert.alert(
        '산책 기록을 남기지 못했어요',
        '걸음 수는 오늘 기록에 반영했지만, 이번 산책은 기록 목록에 남지 않아요.',
      );
    }

    // 기록 화면은 탭에 계속 살아 있어 다시 마운트되지 않는다. 여기서
    // 비워주지 않으면 방금 끝낸 산책이 최근 산책·전체 기록에 앱을 다시
    // 열기 전까지 안 보인다. 걸음 합계도 같이 움직이므로 함께 비운다.
    queryClient.invalidateQueries({ queryKey: ['walk-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['histories'] });

    navigation.replace('WalkResult', {
      roomId,
      roomName: room?.name ?? '',
      mode: room?.mode ?? ('SINGLE' as const),
      steps: finalSteps,
      distanceKm: Math.round(finalDistanceMeters / 100) / 10,
      calories: finalCalories,
      elapsedSeconds: finalElapsedSeconds,
      // 기록으로 남지 못했으면 보상도 없다. 재전송으로 기존 기록이 돌아온
      // 경우에도 서버가 0을 주므로 그때는 보상 줄이 뜨지 않는다.
      earnedPoint:
        outcome.status === 'recorded' ? outcome.walkSession.earnedPoint : 0,
    });
  }, [navigation, roomId, room, queryClient]);

  const handleEndWalk = useCallback(() => {
    Alert.alert('산책 종료', '지금 산책을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: finishWalk },
    ]);
  }, [finishWalk]);

  // 워치에서 종료를 눌렀을 때. 기록 저장과 결과 화면은 이 화면만 할 수 있어서
  // (저장할 수치와 방 정보를 여기서 들고 있다) 워치 쪽은 요청만 남기고,
  // 화면이 뜬 뒤 여기서 이어받는다. 요청은 먼저 비워서 두 번 타지 않게 한다.
  useEffect(() => {
    if (!isEndRequested) {
      return;
    }
    clearWalkSessionEndRequest();
    finishWalk();
  }, [isEndRequested, finishWalk]);

  // 카운트다운이 끝나기 전까지는 지도를 아예 안 띄운다(지도가 살짝
  // 비치는 오버레이보다 완전히 가려진 화면이 낫다는 판단).
  if (showCountdown) {
    return (
      <Screen edges={['top', 'bottom']}>
        <WalkCountdownScreen
          onFinish={() => confirmWalkSessionStart(myPageQuery.data?.gender ?? null)}
        />
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

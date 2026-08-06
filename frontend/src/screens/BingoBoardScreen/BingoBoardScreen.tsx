import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type {
  BingoCellResponse,
  MissionPhoto,
  VerificationResult,
} from '../../features/bingo/api/bingoApi';
import { submitBingoCellPhoto } from '../../features/bingo/api/bingoApi';
import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../features/bingo/components/BingoBoard/BingoBoard';
import { BingoBoard } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useActiveBingoBoardQuery } from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import {
  BattleResultModal,
  type BattleForfeitResult,
} from '../../features/bingo/components/BattleResultModal/BattleResultModal';
import { isForfeitEnd } from '../../features/bingo/model/battleOutcome';
import { BattleProgressCard } from './components/BattleProgressCard';
import { MissionVerificationModal } from '../../features/bingo/components/MissionVerificationModal/MissionVerificationModal';
import {
  MISSION_TYPE_ICONS,
  MISSION_TYPE_LABELS,
  isPhotoMission,
} from '../../features/bingo/model/missionType';
import { useMyMemberIdQuery } from '../../features/member/hooks/useMyMemberIdQuery';
import { useLeaveRoomMutation } from '../../features/room/hooks/useLeaveRoomMutation';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { awaitWalkSessionKey } from '../../features/walk-session/model/walkSessionStore';
import { ApiError } from '../../shared/api/ApiError';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
import { getParticipantColor } from '../../shared/lib/participantColor';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { useMeasuredWidth } from '../../shared/hooks/useMeasuredWidth';

/**
 * 상대의 기권을 알아채는 폴링 간격. 서버가 몰수 때 아무 이벤트도 안 쏴서
 * 조회로만 알 수 있다 — 백엔드에 push 이벤트를 요청해 두었고, 오면 걷어낸다.
 */
const FORFEIT_POLL_INTERVAL_MS = 15_000;

type BingoBoardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'BingoBoard'
>;

export function BingoBoardScreen({
  route,
  navigation,
}: BingoBoardScreenProps) {
  const { roomId } = route.params;
  const boardQuery = useActiveBingoBoardQuery(roomId);
  const board = boardQuery.data ?? null;
  const roomQuery = useRoomDetailQuery(roomId);
  const room = roomQuery.data ?? null;
  const members = room?.members ?? [];
  const myMemberIdQuery = useMyMemberIdQuery();
  const battleProgress = board?.battleProgress ?? null;
  // 실시간 구독은 이 화면이 아니라 산책 세션에 묶여 있다(useWalkSessionRealtime).
  // 화면을 벗어나도 끊기지 않아야 해서 네비게이터에서 한 번만 잡는다.

  // 상대의 기권은 어느 채널로도 밀려오지 않는다(서버가 몰수 때 소켓 이벤트를
  // 안 쏜다). 대결이 진행 중인 동안만 판을 주기적으로 다시 읽어 알아챈다.
  const isBattleOngoing =
    room?.mode === 'BATTLE' && battleProgress?.gameStatus === 'ACTIVE';
  const refetchBoardRef = useRef(boardQuery.refetch);
  refetchBoardRef.current = boardQuery.refetch;
  useEffect(() => {
    if (!isBattleOngoing) {
      return;
    }
    const timer = setInterval(
      () => refetchBoardRef.current(),
      FORFEIT_POLL_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [isBattleOngoing]);

  // 몰수 종료(기권/몰수승)와 보상을 알리는 모달. null이면 닫힘.
  const [forfeitResult, setForfeitResult] =
    useState<BattleForfeitResult | null>(null);

  // 몰수 종료를 한 번만 알린다 — 폴링마다 모달이 다시 열리면 안 된다.
  const forfeitNotifiedRef = useRef(false);
  useEffect(() => {
    if (forfeitNotifiedRef.current || room?.mode !== 'BATTLE') {
      return;
    }

    // 몰수를 알아채는 길은 둘이다. 서버가 게임을 닫으면 활성 판 조회가
    // 409로 떨어지므로 (1) 조회가 "서버가 응답한" 에러로 바뀌었고 캐시에
    // 남은 마지막 진행률에서 아무도 목표에 닿지 않았다면 몰수다 — 정상
    // 승부라면 targetReached 이벤트가 먼저 캐시에 얹혔을 것이다. (2) 혹시
    // 서버가 ENDED를 그대로 내려주는 경우도 같은 결론으로 처리한다.
    // 네트워크 실패(ApiError 아님)로는 절대 승리를 선언하지 않는다.
    const forfeitByError =
      boardQuery.isError &&
      boardQuery.error instanceof ApiError &&
      battleProgress !== null &&
      !battleProgress.me.targetReached &&
      !battleProgress.opponent.targetReached;
    const forfeitByData =
      battleProgress !== null && isForfeitEnd(battleProgress);

    if (!forfeitByError && !forfeitByData) {
      return;
    }
    forfeitNotifiedRef.current = true;
    setForfeitResult('WIN_BY_FORFEIT');
  }, [
    boardQuery.isError,
    boardQuery.error,
    battleProgress,
    room?.mode,
    navigation,
  ]);

  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<MissionPhoto | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  // 빙고판 컨테이너의 퍼센트 width가 잘못 계산돼 3열이 아니라 2열로 보이는
  // 문제가 있었다. 실측한 너비를 고정 픽셀로 내려준다.
  const { width: boardWidth, onLayout: onBoardLayout } = useMeasuredWidth();
  const scrollRef = useRef<ScrollView>(null);
  const detailY = useRef(0);

  const sortedCells = [...(board?.cells ?? [])].sort(
    (a, b) => a.row - b.row || a.col - b.col,
  );
  const isCellCompleted = (cell: BingoCellResponse) =>
    cell.verificationStatus === 'APPROVED';
  const selectedCell =
    sortedCells.find(cell => cell.cellId === selectedCellId) ?? null;

  /**
   * 팀원이 사진을 올려 검증을 기다리는 칸. 협동은 판을 공유하고 서버가 PENDING인
   * 칸의 제출을 거절하므로, 지금 열어주면 사진까지 찍고 나서 거절당한다.
   *
   * 내가 올린 건 잠그지 않는다 — 내 결과를 내가 못 보게 되면 안 된다.
   */
  const isLockedByTeammate = (cell: BingoCellResponse) =>
    cell.verificationStatus === 'PENDING' &&
    cell.submittedByMemberId !== null &&
    cell.submittedByMemberId !== myMemberIdQuery.data;

  const nicknameOf = (memberId: number | null) =>
    members.find(member => member.memberId === memberId)?.nickname ?? '팀원';

  const memberColor = (memberId: number) =>
    getParticipantColor(memberId, myMemberIdQuery.data ?? null, members);

  // 인원별 완료 칸 수를 세서 진행바 색 구간을 만든다.
  const progressSegments = members.map(member => ({
    value: sortedCells.filter(
      cell =>
        cell.verificationStatus === 'APPROVED' &&
        cell.submittedByMemberId === member.memberId,
    ).length,
    color: memberColor(member.memberId) ?? colors.primary,
  }));

  const cellsWithIcons: BingoBoardCell[] = sortedCells.map(cell => {
    const completed = isCellCompleted(cell);
    return {
      id: String(cell.cellId),
      completed,
      color:
        cell.verificationStatus === 'APPROVED' && cell.submittedByMemberId !== null
          ? memberColor(cell.submittedByMemberId)
          : undefined,
      pending: isLockedByTeammate(cell),
      icon: cell.mission.missionImageUrl ? (
        <Image
          source={{ uri: cell.mission.missionImageUrl }}
          style={styles.missionThumbnail}
        />
      ) : (
        <Ionicons
          name={MISSION_TYPE_ICONS[cell.mission.type]}
          size={20}
          color={completed ? colors.surface : colors.ink}
        />
      ),
    };
  });

  const handleSelectCell = useCallback((cellId: number) => {
    setCapturedPhoto(null);
    setVerificationResult(null);
    setSelectedCellId(cellId);
    // 빙고판 아래에 상세가 나타나자마자 바로 보이도록, 레이아웃이 잡힌
    // 다음 프레임에 그 위치로 스크롤한다.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: detailY.current, animated: true });
    });
  }, []);

  const handleDetailLayout = (event: LayoutChangeEvent) => {
    detailY.current = event.nativeEvent.layout.y;
  };

  const leaveMutation = useLeaveRoomMutation();
  const handleForfeit = useCallback(() => {
    Alert.alert(
      '기권하기',
      '기권하면 상대의 승리로 대결이 끝나요. 계속할까요?',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '기권',
          style: 'destructive',
          onPress: () => {
            leaveMutation.mutate(roomId, {
              // 몰수 처리 후에는 나는 이 방의 멤버가 아니라 뒤로 가면 못 읽는다.
              onSuccess: () => setForfeitResult('FORFEITED'),
              onError: error => {
                // 검증 중인 칸이 있으면 서버가 나가기를 막는다.
                Alert.alert(
                  '기권 실패',
                  error instanceof Error
                    ? error.message
                    : '잠시 후 다시 시도해주세요.',
                );
              },
            });
          },
        },
      ],
    );
  }, [leaveMutation, roomId]);

  const handleCapturePhoto = useCallback(async () => {
    // 백엔드 업로드 제한(application.yml, 5MB)을 넘지 않도록 촬영 단계에서
    // 미리 리사이즈·압축한다 — 원본 해상도는 사물 인식에 필요하지도 않다.
    const result = await launchCamera({
      mediaType: 'photo',
      saveToPhotos: false,
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.7,
    });
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      Alert.alert('카메라를 열 수 없어요', result.errorMessage ?? '잠시 후 다시 시도해주세요.');
      return;
    }
    const asset = result.assets?.[0];
    if (asset?.uri) {
      setVerificationResult(null);
      setCapturedPhoto({
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName,
      });
    }
  }, []);

  const handleSubmitMission = useCallback(async () => {
    if (!selectedCell || !capturedPhoto) {
      return;
    }
    setSubmitting(true);
    try {
      // 이 방을 걷는 중이면 인증을 그 산책에 귀속시킨다. 카운트다운 직후에 바로
      // 제출하면 아직 발급 중일 수 있어 여기서 한 번 기다린다(산책 밖에서 판을
      // 열었거나 다른 방 판이면 기다리지 않고 곧바로 null이 온다).
      const walkSessionKey = await awaitWalkSessionKey(roomId);
      const result = await submitBingoCellPhoto(
        roomId,
        selectedCell.cellId,
        capturedPhoto,
        walkSessionKey,
      );
      setVerificationResult(result);
      if (result.status === 'APPROVED') {
        // 서버에 반영된 최신 승인 상태(칸 색·진행 카운트)를 다시 받아온다.
        boardQuery.refetch();
      }
    } catch (error) {
      Alert.alert(
        '제출에 실패했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [roomId, selectedCell, capturedPhoto, boardQuery]);

  const handleCloseVerification = useCallback(() => {
    setCapturedPhoto(null);
    setVerificationResult(null);
  }, []);

  // 몰수로 게임이 닫히면 판 조회가 409로 떨어져 아래 에러 분기로 빠진다.
  // 모달을 본문에만 두면 그 분기에서 안 그려져서, 감지해 놓고도 "빙고판을
  // 불러오지 못했어요"만 보인다 — 어느 분기로 빠지든 모달은 떠야 한다.
  const battleResultModal = (
    <BattleResultModal
      result={forfeitResult}
      onConfirm={() => {
        setForfeitResult(null);
        // 게임이 끝났으니 이 화면은 볼 게 없다 — 홈으로 돌아간다.
        navigation.popToTop();
      }}
    />
  );

  if (boardQuery.isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppText style={styles.statusText}>불러오는 중...</AppText>
      </Screen>
    );
  }

  if (boardQuery.isError || !board) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AppText style={styles.statusText}>빙고판을 불러오지 못했어요.</AppText>
        {battleResultModal}
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <AppText style={styles.headerTitle}>
          {room?.mode === 'SINGLE'
            ? '내 빙고'
            : room?.mode === 'BATTLE'
            ? '대결 빙고'
            : '팀 빙고'}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {board.renewalRequired ? (
          <AppText style={styles.renewalBanner}>
            {board.renewalMessage ?? '빙고판 갱신이 필요합니다.'}
          </AppText>
        ) : null}

        {battleProgress !== null ? (
          <BattleProgressCard
            progress={battleProgress}
            targetBingoCount={room?.targetBingoCount ?? null}
            opponentNickname={
              members.find(
                member => member.memberId === battleProgress.opponent.memberId,
              )?.nickname ?? '상대'
            }
            members={members}
            myMemberId={myMemberIdQuery.data ?? null}
          />
        ) : null}

        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <AppText style={styles.progressLabel}>빙고 진행 상황</AppText>
            <AppText style={styles.progressCount}>
              {board.approvedCellCount}/{board.totalCellCount}
            </AppText>
          </View>
          <MemberProgressBar
            segments={progressSegments}
            total={board.totalCellCount}
          />
          {members.length > 1 ? (
            <View style={styles.legendRow}>
              {members.map(member => (
                <View key={member.memberId} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: memberColor(member.memberId) ?? colors.primary },
                    ]}
                  />
                  <AppText style={styles.legendText}>{member.nickname}</AppText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.board} onLayout={onBoardLayout}>
          {boardWidth > 0 ? (
            <View style={{ width: boardWidth }}>
              <BingoBoard
                size={board.boardSize as BingoBoardSize}
                cells={cellsWithIcons}
                onCellPress={cell => handleSelectCell(Number(cell.id))}
              />
            </View>
          ) : null}
        </View>

        {selectedCell ? (
          <View style={styles.detailCard} onLayout={handleDetailLayout}>
            <View style={styles.detailHeaderRow}>
              <Ionicons
                name={MISSION_TYPE_ICONS[selectedCell.mission.type]}
                size={20}
                color={colors.ink}
              />
              <AppText style={styles.detailTitle}>{selectedCell.mission.title}</AppText>
              <View style={styles.pointBadge}>
                <AppText style={styles.pointBadgeText}>
                  +{selectedCell.mission.point}P
                </AppText>
              </View>
            </View>
            <AppText style={styles.missionTypeText}>
              {MISSION_TYPE_LABELS[selectedCell.mission.type]} 미션
            </AppText>
            <AppText style={styles.missionDetail}>{selectedCell.mission.detail}</AppText>

            {isCellCompleted(selectedCell) ? (
              <View style={styles.completedRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.successText}
                />
                <AppText style={styles.completedText}>인증 완료</AppText>
              </View>
            ) : isLockedByTeammate(selectedCell) ? (
              // 칸을 열어둔 사이 팀원이 사진을 올렸다. 여기서 인증을 열어주면
              // 서버가 거절하므로 안내만 한다.
              <View style={styles.pendingRow}>
                <Ionicons name="hourglass-outline" size={20} color={colors.ink} />
                <AppText style={styles.pendingText}>
                  {`${nicknameOf(selectedCell.submittedByMemberId)}님이 인증 중이에요.`}
                </AppText>
              </View>
            ) : isPhotoMission(selectedCell.mission.type) ? (
              <>
                <AppText style={styles.captureHint}>
                  사물을 너무 가까이 확대해서 찍으면 인식에 실패할 수 있어요.
                </AppText>
                <Pressable
                  style={styles.captureButton}
                  onPress={handleCapturePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="사진으로 인증하기"
                >
                  <Ionicons name="camera" size={18} color={colors.surface} />
                  <AppText style={styles.captureButtonText}>사진으로 인증하기</AppText>
                </Pressable>
              </>
            ) : (
              <View style={styles.autoHintRow}>
                <Ionicons name="walk-outline" size={20} color={colors.ink} style={styles.autoHintIcon} />
                <AppText style={styles.autoHintText}>산책하는 동안 자동으로 인증돼요.</AppText>
              </View>
            )}
          </View>
        ) : null}

        {/* 기권은 진행 중인 대결에서만 보인다. 끝난 판에서는 무의미하고,
            협동·솔로에는 기권 개념이 없다. */}
        {room?.mode === 'BATTLE' &&
        battleProgress?.gameStatus === 'ACTIVE' ? (
          <Button
            label="기권하기"
            variant="danger"
            onPress={handleForfeit}
            accessibilityLabel="기권하기"
            style={styles.forfeitButton}
          />
        ) : null}
      </ScrollView>

      {battleResultModal}

      <MissionVerificationModal
        visible={capturedPhoto !== null}
        onClose={handleCloseVerification}
        photoUri={capturedPhoto?.uri ?? null}
        missionTitle={selectedCell?.mission.title ?? ''}
        isSubmitting={isSubmitting}
        result={verificationResult}
        onRetake={handleCapturePhoto}
        onSubmit={handleSubmitMission}
        onConfirm={handleCloseVerification}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: lineHeights[18],
    color: colors.ink,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  renewalBanner: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.highlightSoftBg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  forfeitButton: {
    marginTop: spacing.lg,
  },
  progressCard: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
  },
  progressCount: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
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
  board: {
    width: '100%',
  },
  missionThumbnail: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
  },
  detailCard: {
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.ink,
  },
  pointBadge: {
    backgroundColor: colors.highlightSoftBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pointBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.highlightText,
  },
  missionTypeText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  missionDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  completedText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.successText,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  pendingText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  autoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  autoHintIcon: {
    opacity: 0.6,
  },
  autoHintText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.7,
  },
  captureHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  captureButton: {
    height: controlHeight.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  captureButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.surface,
  },
});

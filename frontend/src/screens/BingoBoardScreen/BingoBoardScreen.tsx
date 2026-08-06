import { useCallback, useRef, useState } from 'react';
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
import { MissionVerificationModal } from '../../features/bingo/components/MissionVerificationModal/MissionVerificationModal';
import {
  MISSION_TYPE_ICONS,
  MISSION_TYPE_LABELS,
  isPhotoMission,
} from '../../features/bingo/model/missionType';
import { useMyMemberIdQuery } from '../../features/member/hooks/useMyMemberIdQuery';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { awaitWalkSessionKey } from '../../features/walk-session/model/walkSessionStore';
import { AppText } from '../../shared/components/AppText/AppText';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
import { getParticipantColor } from '../../shared/lib/participantColor';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { useMeasuredWidth } from '../../shared/hooks/useMeasuredWidth';

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
          {room?.mode === 'SINGLE' ? '내 빙고' : '팀 빙고'}
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
      </ScrollView>

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

import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { BingoCellResponse, VerificationResult } from '../../features/bingo/api/bingoApi';
import { submitMissionPhoto } from '../../features/bingo/api/bingoApi';
import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../features/bingo/components/BingoBoard/BingoBoard';
import { BingoBoard } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useActiveBingoBoardQuery } from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import { MissionVerificationModal } from '../../features/bingo/components/MissionVerificationModal/MissionVerificationModal';
import type { MissionType } from '../../features/bingo/model/missionType';
import {
  MISSION_TYPE_LABELS,
  MISSION_TYPE_POINTS,
} from '../../features/bingo/model/missionType';
import { useRoomDetailQuery } from '../../features/room/hooks/useRoomDetailQuery';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors, participantColors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily } from '../../shared/constants/typography';
import { useMeasuredWidth } from '../../shared/hooks/useMeasuredWidth';

// 미션에 등록된 이미지가 없을 때 쓰는 유형별 기본 아이콘.
const MISSION_TYPE_ICONS: Record<MissionType, IoniconsIconName> = {
  OBJECT: 'cube-outline',
  ATTRIBUTE: 'sparkles-outline',
  RELATION: 'people-outline',
  ORDINARY: 'walk-outline',
};

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

  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  // 사진 인증 API가 아직 없어(TODO, bingoApi.ts 참고) 실제 서버에는 반영되지
  // 않는다. 승인된 칸을 화면에서만 채워진 것처럼 보여주는 로컬 오버레이다.
  const [locallyApprovedCellIds, setLocallyApprovedCellIds] = useState<
    Set<number>
  >(new Set());
  // 빙고판 컨테이너의 퍼센트 width가 잘못 계산돼 3열이 아니라 2열로 보이는
  // 문제가 있었다. 실측한 너비를 고정 픽셀로 내려준다.
  const { width: boardWidth, onLayout: onBoardLayout } = useMeasuredWidth();
  const scrollRef = useRef<ScrollView>(null);
  const detailY = useRef(0);

  const sortedCells = [...(board?.cells ?? [])].sort(
    (a, b) => a.row - b.row || a.col - b.col,
  );
  const isCellCompleted = (cell: BingoCellResponse) =>
    cell.verificationStatus === 'APPROVED' ||
    locallyApprovedCellIds.has(cell.cellId);
  const selectedCell =
    sortedCells.find(cell => cell.cellId === selectedCellId) ?? null;

  const memberColor = (memberId: number) => {
    const index = members.findIndex(member => member.memberId === memberId);
    return index >= 0 ? participantColors[index % participantColors.length] : undefined;
  };

  // 인원별 완료 칸 수를 세서 진행바 색 구간을 만든다. 로컬로만 승인된 칸은
  // 누가 했는지 서버가 모르니(실제 제출이 아니다) 구간에 넣지 않는다.
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
    setCapturedPhotoUri(null);
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
    const result = await launchCamera({ mediaType: 'photo', saveToPhotos: false });
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      Alert.alert('카메라를 열 수 없어요', result.errorMessage ?? '잠시 후 다시 시도해주세요.');
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setVerificationResult(null);
      setCapturedPhotoUri(uri);
    }
  }, []);

  const handleSubmitMission = useCallback(async () => {
    if (!selectedCell) {
      return;
    }
    setSubmitting(true);
    const result = await submitMissionPhoto(selectedCell.mission.type);
    setSubmitting(false);
    setVerificationResult(result);
    if (result.status === 'APPROVED') {
      const cellId = selectedCell.cellId;
      setLocallyApprovedCellIds(previous => new Set(previous).add(cellId));
    }
  }, [selectedCell]);

  const handleCloseVerification = useCallback(() => {
    setCapturedPhotoUri(null);
    setVerificationResult(null);
  }, []);

  if (boardQuery.isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={styles.statusText}>불러오는 중...</Text>
      </Screen>
    );
  }

  if (boardQuery.isError || !board) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text style={styles.statusText}>빙고판을 불러오지 못했어요.</Text>
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
        <Text style={styles.headerTitle}>
          {room?.mode === 'SINGLE' ? '내 빙고' : '팀 빙고'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {board.renewalRequired ? (
          <Text style={styles.renewalBanner}>
            {board.renewalMessage ?? '빙고판 갱신이 필요합니다.'}
          </Text>
        ) : null}

        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>빙고 진행 상황</Text>
            <Text style={styles.progressCount}>
              {board.approvedCellCount}/{board.totalCellCount}
            </Text>
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
                  <Text style={styles.legendText}>{member.nickname}</Text>
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
              <Text style={styles.detailTitle}>{selectedCell.mission.title}</Text>
              <View style={styles.pointBadge}>
                <Text style={styles.pointBadgeText}>
                  +{MISSION_TYPE_POINTS[selectedCell.mission.type]}P
                </Text>
              </View>
            </View>
            <Text style={styles.missionTypeText}>
              {MISSION_TYPE_LABELS[selectedCell.mission.type]} 미션
            </Text>
            <Text style={styles.missionDetail}>{selectedCell.mission.detail}</Text>

            {isCellCompleted(selectedCell) ? (
              <View style={styles.completedRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.successText}
                />
                <Text style={styles.completedText}>인증 완료</Text>
              </View>
            ) : (
              <Pressable
                style={styles.captureButton}
                onPress={handleCapturePhoto}
                accessibilityRole="button"
                accessibilityLabel="사진으로 인증하기"
              >
                <Ionicons name="camera" size={18} color={colors.surface} />
                <Text style={styles.captureButtonText}>사진으로 인증하기</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>

      <MissionVerificationModal
        visible={capturedPhotoUri !== null}
        onClose={handleCloseVerification}
        photoUri={capturedPhotoUri}
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
    color: colors.ink,
    opacity: 0.6,
  },
  progressCount: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
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
    color: colors.highlightText,
  },
  missionTypeText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  missionDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
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
    color: colors.successText,
  },
  captureButton: {
    height: 52,
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
    color: colors.surface,
  },
});

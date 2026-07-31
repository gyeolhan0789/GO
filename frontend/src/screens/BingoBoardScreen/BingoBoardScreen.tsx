import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { VerificationResult } from '../../features/bingo/api/bingoApi';
import { submitMissionPhoto } from '../../features/bingo/api/bingoApi';
import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../features/bingo/components/BingoBoard/BingoBoard';
import { BingoBoard } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { MissionVerificationModal } from '../../features/bingo/components/MissionVerificationModal/MissionVerificationModal';
import type { MissionType } from '../../features/bingo/model/missionType';
import {
  MISSION_TYPE_LABELS,
  MISSION_TYPE_POINTS,
} from '../../features/bingo/model/missionType';
import { AppText } from '../../shared/components/AppText/AppText';
import { MemberProgressBar } from '../../shared/components/MemberProgressBar/MemberProgressBar';
import { Screen } from '../../shared/components/Screen/Screen';
import { controlHeight } from '../../shared/constants/sizing';
import { colors, participantColors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { useMeasuredWidth } from '../../shared/hooks/useMeasuredWidth';

type Mission = {
  title: string;
  detail: string;
  icon: IoniconsIconName;
  type: MissionType;
};

type SessionCell = BingoBoardCell & { mission: Mission; completedByMemberId?: string };

// TODO: 방/빙고판 실제 API 연동 전까지의 임시 목업 데이터.
const MOCK_MEMBERS = [
  { id: 'me', nickname: '명듀에용', color: participantColors[0] },
  { id: 'p2', nickname: '지민', color: participantColors[1] },
  { id: 'p3', nickname: '하은', color: participantColors[2] },
  { id: 'p4', nickname: '준호', color: participantColors[3] },
];

// 5x5(25칸)까지 미리보기할 수 있도록 넉넉히 채워둔다. 실제로는 방의
// boardSize만큼만 서버가 내려주는 미션으로 잘라 쓰게 된다.
const MOCK_MISSIONS: Mission[] = [
  { title: '벚꽃 나무 찾기', detail: '주변에서 꽃이 핀 나무를 찾아 사진으로 인증해보세요.', icon: 'leaf-outline', type: 'OBJECT' },
  { title: '고양이 만나기', detail: '동네를 걷다 고양이를 만나면 인증해보세요.', icon: 'paw-outline', type: 'RELATION' },
  { title: '카페 방문하기', detail: '가까운 카페에 들러 인증해보세요.', icon: 'cafe-outline', type: 'ORDINARY' },
  { title: '벤치에서 쉬기', detail: '공원 벤치에서 잠깐 쉬며 인증해보세요.', icon: 'bed-outline', type: 'ORDINARY' },
  { title: '무지개 다리 건너기', detail: '동네의 다리를 하나 건너보세요.', icon: 'trail-sign-outline', type: 'OBJECT' },
  { title: '분수대 찾기', detail: '주변 분수대를 찾아 인증해보세요.', icon: 'water-outline', type: 'OBJECT' },
  { title: '강아지 만나기', detail: '산책 중인 강아지를 만나면 인증해보세요.', icon: 'paw-outline', type: 'RELATION' },
  { title: '노을 감상하기', detail: '하늘이 붉게 물드는 순간을 담아보세요.', icon: 'sunny-outline', type: 'ATTRIBUTE' },
  { title: '동네 한 바퀴', detail: '집 주변을 한 바퀴 돌아보세요.', icon: 'walk-outline', type: 'ORDINARY' },
  { title: '우체통 찾기', detail: '동네 우체통을 찾아 인증해보세요.', icon: 'mail-outline', type: 'OBJECT' },
  { title: '자전거 타는 사람', detail: '자전거 타는 사람을 만나면 인증해보세요.', icon: 'bicycle-outline', type: 'RELATION' },
  { title: '꽃 사진 찍기', detail: '길가에 핀 꽃을 사진으로 남겨보세요.', icon: 'flower-outline', type: 'OBJECT' },
  { title: '계단 오르기', detail: '동네 계단을 하나 올라보세요.', icon: 'trending-up-outline', type: 'ORDINARY' },
  { title: '표지판 찾기', detail: '재미있는 표지판을 찾아 인증해보세요.', icon: 'information-circle-outline', type: 'OBJECT' },
  { title: '놀이터 지나기', detail: '동네 놀이터를 지나가보세요.', icon: 'happy-outline', type: 'ORDINARY' },
  { title: '새 소리 듣기', detail: '새 소리가 들리는 곳에서 인증해보세요.', icon: 'musical-notes-outline', type: 'ATTRIBUTE' },
  { title: '가로수길 걷기', detail: '가로수가 늘어선 길을 걸어보세요.', icon: 'leaf-outline', type: 'ORDINARY' },
  { title: '편의점 들르기', detail: '가까운 편의점에 들러보세요.', icon: 'storefront-outline', type: 'ORDINARY' },
  { title: '버스 정류장 지나기', detail: '버스 정류장을 지나가보세요.', icon: 'bus-outline', type: 'ORDINARY' },
  { title: '강아지 산책러 만나기', detail: '강아지와 산책하는 사람을 만나면 인증해보세요.', icon: 'paw-outline', type: 'RELATION' },
  { title: '하늘 사진 찍기', detail: '오늘의 하늘을 사진으로 남겨보세요.', icon: 'cloud-outline', type: 'ATTRIBUTE' },
  { title: '벽화 찾기', detail: '동네 벽화를 찾아 인증해보세요.', icon: 'image-outline', type: 'OBJECT' },
  { title: '공원 벤치 앉기', detail: '공원 벤치에 앉아보세요.', icon: 'bed-outline', type: 'ORDINARY' },
  { title: '물웅덩이 피하기', detail: '물웅덩이를 만나면 인증해보세요.', icon: 'water-outline', type: 'ATTRIBUTE' },
  { title: '동네 지도 그리기', detail: '오늘 걸은 길을 떠올려보세요.', icon: 'map-outline', type: 'ORDINARY' },
];

// TODO: 실제로는 방의 boardSize를 그대로 쓴다. 지금은 3/4/5 렌더링을
// 눈으로 확인하려고 값만 바꿔가며 테스트한다.
const MOCK_BOARD_SIZE: BingoBoardSize = 3;

const INITIAL_CELLS: SessionCell[] = MOCK_MISSIONS.slice(
  0,
  MOCK_BOARD_SIZE * MOCK_BOARD_SIZE,
).map((mission, index) => {
  const completed = index < 5;
  return {
    id: String(index),
    completed,
    mission,
    // 완료한 칸을 인원별로 돌아가며 배정한 임시 데이터. 실제로는 서버가
    // 어떤 멤버가 완료했는지 함께 내려준다.
    completedByMemberId: completed
      ? MOCK_MEMBERS[index % MOCK_MEMBERS.length].id
      : undefined,
  };
});

type BingoBoardNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'BingoBoard'
>;

export function BingoBoardScreen() {
  const navigation = useNavigation<BingoBoardNavigation>();
  const [cells, setCells] = useState<SessionCell[]>(INITIAL_CELLS);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  // 빙고판 컨테이너의 퍼센트 width가 잘못 계산돼 3열이 아니라 2열로 보이는
  // 문제가 있었다. 실측한 너비를 고정 픽셀로 내려준다.
  const { width: boardWidth, onLayout: onBoardLayout } = useMeasuredWidth();
  const scrollRef = useRef<ScrollView>(null);
  const detailY = useRef(0);

  const selectedCell = cells.find(cell => cell.id === selectedCellId) ?? null;
  const completedCount = cells.filter(cell => cell.completed).length;

  // 인원별 완료 칸 수를 세서 진행바 색 구간을 만든다.
  const progressSegments = MOCK_MEMBERS.map(member => ({
    value: cells.filter(cell => cell.completedByMemberId === member.id).length,
    color: member.color,
  }));

  const cellsWithIcons = cells.map(cell => {
    const member = MOCK_MEMBERS.find(item => item.id === cell.completedByMemberId);
    return {
      ...cell,
      color: member?.color,
      icon: (
        <Ionicons
          name={cell.mission.icon}
          size={20}
          color={cell.completed ? colors.surface : colors.ink}
        />
      ),
    };
  });

  const handleSelectCell = useCallback((cell: SessionCell) => {
    setCapturedPhotoUri(null);
    setVerificationResult(null);
    setSelectedCellId(cell.id);
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
      const cellId = selectedCell.id;
      setCells(previous =>
        previous.map(cell =>
          cell.id === cellId
            ? { ...cell, completed: true, completedByMemberId: 'me' }
            : cell,
        ),
      );
    }
  }, [selectedCell]);

  const handleCloseVerification = useCallback(() => {
    setCapturedPhotoUri(null);
    setVerificationResult(null);
  }, []);

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
        <AppText style={styles.headerTitle}>팀 빙고</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <AppText style={styles.progressLabel}>빙고 진행 상황</AppText>
            <AppText style={styles.progressCount}>
              {completedCount}/{cells.length}
            </AppText>
          </View>
          <MemberProgressBar segments={progressSegments} total={cells.length} />
          <View style={styles.legendRow}>
            {MOCK_MEMBERS.map(member => (
              <View key={member.id} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: member.color }]}
                />
                <AppText style={styles.legendText}>{member.nickname}</AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.board} onLayout={onBoardLayout}>
          {boardWidth > 0 ? (
            <View style={{ width: boardWidth }}>
              <BingoBoard
                size={MOCK_BOARD_SIZE}
                cells={cellsWithIcons}
                onCellPress={cell => {
                  const sessionCell = cells.find(item => item.id === cell.id);
                  if (sessionCell) {
                    handleSelectCell(sessionCell);
                  }
                }}
              />
            </View>
          ) : null}
        </View>

        {selectedCell ? (
          <View style={styles.detailCard} onLayout={handleDetailLayout}>
            <View style={styles.detailHeaderRow}>
              <Ionicons
                name={selectedCell.mission.icon}
                size={20}
                color={colors.ink}
              />
              <AppText style={styles.detailTitle}>{selectedCell.mission.title}</AppText>
              <View style={styles.pointBadge}>
                <AppText style={styles.pointBadgeText}>
                  +{MISSION_TYPE_POINTS[selectedCell.mission.type]}P
                </AppText>
              </View>
            </View>
            <AppText style={styles.missionTypeText}>
              {MISSION_TYPE_LABELS[selectedCell.mission.type]} 미션
            </AppText>
            <AppText style={styles.missionDetail}>{selectedCell.mission.detail}</AppText>

            {selectedCell.completed ? (
              <View style={styles.completedRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.successText}
                />
                <AppText style={styles.completedText}>인증 완료</AppText>
              </View>
            ) : (
              <Pressable
                style={styles.captureButton}
                onPress={handleCapturePhoto}
                accessibilityRole="button"
                accessibilityLabel="사진으로 인증하기"
              >
                <Ionicons name="camera" size={18} color={colors.surface} />
                <AppText style={styles.captureButtonText}>사진으로 인증하기</AppText>
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

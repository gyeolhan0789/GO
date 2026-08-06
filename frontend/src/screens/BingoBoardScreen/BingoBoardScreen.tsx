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
import {
  isNoBoardError,
  useActiveBingoBoardQuery,
} from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import {
  BattleResultModal,
  type BattleResult,
} from '../../features/bingo/components/BattleResultModal/BattleResultModal';
import {
  isForfeitEnd,
  resolveBattleOutcome,
} from '../../features/bingo/model/battleOutcome';
import { useBattleProgressSubscription } from '../../features/bingo/hooks/useBattleProgressSubscription';
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
import { useRoomPresenceSubscription } from '../../features/room/hooks/useRoomPresenceSubscription';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
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
  const walkSession = useWalkSession();
  // 실시간 구독은 이 화면이 아니라 산책 세션에 묶여 있다(useWalkSessionRealtime).
  // 화면을 벗어나도 끊기지 않아야 해서 네비게이터에서 한 번만 잡는다.

  // 상대의 기권은 어느 채널로도 밀려오지 않는다 — 서버가 몰수 때 소켓 이벤트를
  // 안 쏜다. 대신 방 presence가 상대의 소켓이 방에서 빠진 순간을 알려주므로,
  // 그때 판을 한 번 다시 읽어 확인한다. 15초마다 두드리던 폴링을 걷어냈다.
  //
  // presence의 LEFT 자체를 몰수로 읽지는 않는다. 그건 "소켓이 끊겼다"까지만
  // 뜻해서 지하철 한 정거장이나 앱 백그라운드로도 뜬다 — 이 브랜치에서 LTE
  // 유휴 소켓이 18~187초마다 끊기는 걸 실기기로 확인했다. 승패는 서버가
  // "그 판은 끝났다"고 답할 때만 정한다.
  //
  // LEFT는 offline으로 넘어가는 순간에만 온다. 상대 소켓이 이미 끊긴 뒤에
  // 판이 끝나면 이벤트가 더 오지 않는데, 그건 앱을 다시 열 때 focusManager가
  // 걸어주는 refetch가 받아낸다(AppProviders).
  const isBattleOngoing =
    room?.mode === 'BATTLE' && battleProgress?.gameStatus === 'ACTIVE';
  const refetchBoardRef = useRef(boardQuery.refetch);
  refetchBoardRef.current = boardQuery.refetch;

  // 방 멤버가 아니면 서버가 presence 구독을 거절하고, 그 ERROR 프레임이 소켓
  // 전체를 재연결 루프에 빠뜨린다. 방 상세로 내 멤버 여부를 확인한 뒤에 켠다.
  const myMemberId = myMemberIdQuery.data ?? null;
  const isRoomMember =
    myMemberId !== null &&
    members.some(member => member.memberId === myMemberId);
  const opponentMemberId = battleProgress?.opponent.memberId ?? null;

  // 구독은 방 멤버이면 켠다 — 대결이 아니어도 이 방에 누가 있는지는 같은
  // 이야기이고, 계약도 "방 화면에 진입하면 구독"이다. 기권 판정만 대결에
  // 한정한다(협동방에는 상대가 없어 아래 조건이 그냥 통과되지 않는다).
  const { onlineMembers } = useRoomPresenceSubscription({
    roomId,
    enabled: isRoomMember,
    onEvent: event => {
      if (
        !isBattleOngoing ||
        event.type !== 'LEFT' ||
        event.memberId !== opponentMemberId
      ) {
        return;
      }
      refetchBoardRef.current();
    },
  });

  // 대결 진행률 이벤트는 산책 세션에도 묶여 있지만(useWalkSessionRealtime),
  // 산책 없이 판만 열어 둔 경우가 실제로 있다 — 그때 상대의 targetReached가
  // 올 채널이 없어서 이긴 줄도 진 줄도 모른 채 화면이 멈춰 있었다. 이 화면이
  // 떠 있는 동안은 스스로도 구독한다. 산책 중이면 같은 토픽을 두 번 받는데,
  // 이벤트 반영이 멱등이라 값은 어긋나지 않는다.
  useBattleProgressSubscription(roomId, isBattleOngoing && isRoomMember);

  // 대결 종료(목표 달성 승패/기권/몰수승)와 보상을 알리는 모달. null이면 닫힘.
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // 승부가 이미 갈렸는가. 모달이 뜬 뒤에도 판과 기권 버튼이 살아 있으면
  // 끝난 대결에 인증이 나가거나 이긴 쪽이 기권할 수 있다 — 캐시의 gameStatus가
  // ACTIVE로 남은 짧은 틈에도 막아야 해서 이벤트로 아는 결과까지 함께 본다.
  const isBattleDecided =
    room?.mode === 'BATTLE' &&
    (battleResult !== null ||
      (battleProgress !== null &&
        resolveBattleOutcome(battleProgress) !== 'IN_PROGRESS'));

  // 종료를 한 번만 알린다 — 갱신마다 모달이 다시 열리면 안 된다.
  const resultNotifiedRef = useRef(false);
  useEffect(() => {
    if (resultNotifiedRef.current || room?.mode !== 'BATTLE') {
      return;
    }

    // 목표 달성 승패. targetReached는 진행률 이벤트나 판 재조회로 캐시에 얹힌다.
    const outcome =
      battleProgress === null ? null : resolveBattleOutcome(battleProgress);
    if (outcome === 'WIN' || outcome === 'LOSE') {
      resultNotifiedRef.current = true;
      setBattleResult(outcome);
      return;
    }

    // 몰수를 알아채는 길은 둘이다. 서버가 게임을 닫으면 활성 판 조회가
    // 404/409로 떨어지므로 (1) 조회가 "판이 없다"로 바뀌었고 캐시에 남은
    // 마지막 진행률에서 아무도 목표에 닿지 않았다면 몰수다 — 정상 승부라면
    // targetReached 이벤트가 먼저 캐시에 얹혔을 것이다. (2) 혹시 서버가
    // ENDED를 그대로 내려주는 경우도 같은 결론으로 처리한다.
    //
    // 판정 근거를 404/409로 좁혀 둔다. 여기를 `instanceof ApiError`로 두면
    // 서버가 죽어 502가 나는 동안에도 "상대가 기권했다"고 선언한다 —
    // 2026-08-06 dev 백엔드가 내려갔을 때 실기기에서 실제로 오탐이 났다.
    // 승리 선언은 서버가 "그 판은 끝났다"고 말했을 때만 한다.
    const forfeitByError =
      boardQuery.isError &&
      isNoBoardError(boardQuery.error) &&
      battleProgress !== null &&
      !battleProgress.me.targetReached &&
      !battleProgress.opponent.targetReached;
    const forfeitByData =
      battleProgress !== null && isForfeitEnd(battleProgress);

    if (!forfeitByError && !forfeitByData) {
      return;
    }
    resultNotifiedRef.current = true;
    setBattleResult('WIN_BY_FORFEIT');
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

  const handleSelectCell = useCallback(
    (cellId: number) => {
      // 승부가 갈린 판은 더 만질 수 없다. 여기서 열어주면 끝난 대결에
      // 인증 요청이 나간다.
      if (isBattleDecided) {
        return;
      }
      setCapturedPhoto(null);
      setVerificationResult(null);
      setSelectedCellId(cellId);
      // 빙고판 아래에 상세가 나타나자마자 바로 보이도록, 레이아웃이 잡힌
      // 다음 프레임에 그 위치로 스크롤한다.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: detailY.current, animated: true });
      });
    },
    [isBattleDecided],
  );

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
              onSuccess: () => setBattleResult('FORFEITED'),
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
      result={battleResult}
      onConfirm={() => {
        setBattleResult(null);

        // 대결방은 한 판짜리다. 결과를 확인했으면 방에서도 나간다 — 남겨두면
        // 게임만 끝나고 방은 ACTIVE로 남아(서버가 방을 닫지 않는다) 홈의
        // '대결 이어가기'가 죽은 대결을 계속 가리킨다.
        //
        // 기권(FORFEITED)은 기권 자체가 나가기라 이미 방에서 빠져 있다.
        //
        // 이 방을 걷는 중이면 나가지 않는다 — 방장의 나가기는 방을 닫으면서
        // 서버의 활성 산책 세션까지 지워서, 아직 안 끝낸 산책이 기록될 길을
        // 잃는다. 산책 화면으로 보내 산책부터 끝내게 한다.
        const walkingThisRoom =
          walkSession.isActive && walkSession.roomId === roomId;

        if (battleResult !== 'FORFEITED' && !walkingThisRoom) {
          leaveMutation.mutate(roomId, {
            onError: error => {
              // 상대(방장)가 먼저 결과를 확인하고 나갔으면 방이 이미 닫혀
              // ROOM_CLOSED가 온다 — 원하던 결과라 알릴 것이 없다. 같은 409라
              // 상태 코드로는 못 가르고 메시지로 가른다(응답에 에러 코드
              // 식별자가 없다 — 백엔드에 추가 요청 예정).
              if (
                error instanceof ApiError &&
                error.message.includes('종료된 게임방')
              ) {
                return;
              }
              // 그 밖의 거절은 방이 홈에 남는 이유다. 조용히 삼키면
              // '대결 이어가기'가 왜 계속 뜨는지 알 수 없게 된다 — 실제로
              // "검증 중인 빙고 칸" 409를 삼켜서 그랬다(2026-08-06).
              Alert.alert(
                '대결방을 정리하지 못했어요',
                error instanceof Error
                  ? error.message
                  : '잠시 후 다시 시도해주세요.',
              );
            },
          });
        }

        if (walkingThisRoom) {
          navigation.navigate('WalkSession');
          return;
        }
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
            onlineMembers={onlineMembers}
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

            {isBattleDecided ? (
              // 승부가 갈렸다. 열려 있던 상세에서도 인증이 나가면 안 된다.
              <View style={styles.pendingRow}>
                <Ionicons name="flag-outline" size={20} color={colors.ink} />
                <AppText style={styles.pendingText}>
                  대결이 끝나 더 인증할 수 없어요.
                </AppText>
              </View>
            ) : isCellCompleted(selectedCell) ? (
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
            협동·솔로에는 기권 개념이 없다. gameStatus만 보면 승부가 갈리고
            캐시가 갱신되기 전의 짧은 틈에 이긴 쪽이 기권할 수 있다. */}
        {room?.mode === 'BATTLE' &&
        battleProgress?.gameStatus === 'ACTIVE' &&
        !isBattleDecided ? (
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

import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { BingoMissionResponse } from '../../features/bingo/api/bingoApi';
import type {
  BingoBoardCell,
  BingoBoardSize,
} from '../../features/bingo/components/BingoBoard/BingoBoard';
import { BoardRenewalSheet } from '../../features/bingo/components/BoardRenewalSheet/BoardRenewalSheet';
import { useActiveBingoBoardQuery } from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import { MISSION_TYPE_ICONS } from '../../features/bingo/model/missionType';
import { useMyPointQuery } from '../../features/member/hooks/useMyPointQuery';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../features/member/model/equippedItems';
import { useMyRoomsQuery } from '../../features/room/hooks/useMyRoomsQuery';
import { useWalkSession } from '../../features/walk-session/hooks/useWalkSession';
import {
  isWalkSessionActive,
  startWalkSession,
} from '../../features/walk-session/model/walkSessionStore';
import { Screen } from '../../shared/components/Screen/Screen';
import { Button } from '../../shared/components/Button/Button';
import { colors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { useStepDataToday } from '../../shared/hooks/useStepDataToday';
import { CreateSoloWalkSheet } from './components/CreateSoloWalkSheet';
import { HomeHeader } from './components/HomeHeader';
import { HomeCarousel } from './components/HomeCarousel';
import { MissionInfoModal } from './components/MissionInfoModal';
import { WalkRoomSelectSheet } from './components/WalkRoomSelectSheet';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// TODO: 목표 걸음수 연동 전까지의 임시 목업 데이터.
// 걸음/거리/칼로리는 useSamsungHealthToday, 포인트·캐릭터는 각각
// useMyPointQuery·useMyCharacterQuery로 실측값을 따로 받아온다.
const MOCK_HOME_SUMMARY = {
  goalSteps: 10000,
  canRewardHint: '1,000보 더 걸으면 캔 1개를 더 모아요',
};

const DEFAULT_BINGO_SIZE: BingoBoardSize = 5;
const NO_BINGO_BOARD_HINT = '산책을 시작하고 이번 주 빙고에 도전해보세요!';

function formatElapsed(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function HomeScreen() {
  const summary = MOCK_HOME_SUMMARY;
  const navigation = useNavigation<HomeNavigation>();
  const [isRoomSheetVisible, setRoomSheetVisible] = useState(false);
  const [isSoloSheetVisible, setSoloSheetVisible] = useState(false);
  const [selectedMission, setSelectedMission] =
    useState<BingoMissionResponse | null>(null);
  // 협동 방을 고른 뒤 빙고판 갱신이 필요하고 내가 방장일 때만 채워진다.
  const [groupRenewal, setGroupRenewal] = useState<{
    roomId: number;
    targetStepCount: number | null;
    boardSize: number;
  } | null>(null);

  // 로딩/실패 중에는 가짜 숫자·이름 대신 빈 값을 보여준다.
  const point = useMyPointQuery();
  const points = point.data?.point ?? 0;
  const character = useMyCharacterQuery();
  const characterName = character.data?.nickname ?? '';
  // 마이페이지·상점과 같은 순서로 겹쳐야 같은 조합이 화면마다 똑같이 보인다.
  const characterItems = selectLayerItems(
    toEquippedByCategory(character.data?.equippedItems ?? []),
  );

  // 홈 화면에서도 진행 중인 산책을 놓치지 않도록, 캐릭터 카드에 뱃지로
  // 살짝 보여준다.
  const walkSession = useWalkSession();

  // 진행 중인 솔로 방이 이미 있으면(빙고를 다 못 채웠거나 일주일이 안
  // 지났으면 방은 그대로 유지된다) 목표를 다시 입력받지 않고 그 방으로
  // 바로 이어서 들어간다.
  const mySoloRoomsQuery = useMyRoomsQuery('SINGLE');
  const activeSoloRoom = mySoloRoomsQuery.data?.[0] ?? null;

  // 진행 중인 세션이 있어도 그게 지금 누른 버튼과 다른 모드면(예: 솔로 산책
  // 중에 "같이하기"를 누름) 그 세션으로 그냥 이어가면 안 되고 막아야 한다.
  const isActiveSessionSolo =
    walkSession.isActive &&
    activeSoloRoom !== null &&
    walkSession.roomId === activeSoloRoom.roomId;

  // 활성 솔로 방의 빙고판이 다 채워졌거나 일주일이 지나 갱신이 필요한지
  // 서버 판단을 그대로 따른다(프론트에서 날짜를 다시 계산하지 않는다).
  const activeSoloBoardQuery = useActiveBingoBoardQuery(
    activeSoloRoom?.roomId ?? null,
  );
  const soloRenewal =
    activeSoloRoom && activeSoloBoardQuery.data?.renewalRequired
      ? {
          roomId: activeSoloRoom.roomId,
          currentTargetStepCount: activeSoloBoardQuery.data.targetStepCount,
          currentBoardSize: activeSoloBoardQuery.data.boardSize,
        }
      : undefined;

  // 진행 중인 솔로 방이 없거나 아직 안 불러와졌으면 빈 판을 보여준다.
  const bingoSize =
    (activeSoloBoardQuery.data?.boardSize as BingoBoardSize | undefined) ??
    DEFAULT_BINGO_SIZE;
  const rawBingoCells = activeSoloBoardQuery.data?.cells ?? [];
  const bingoCells: BingoBoardCell[] = [...rawBingoCells]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map(cell => {
      const completed = cell.verificationStatus === 'APPROVED';
      return {
        id: String(cell.cellId),
        completed,
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

  // 로딩 중에는 아직 없다고 단정할 수 없으니 안내 문구를 잠깐이라도 잘못
  // 보여주지 않도록 로딩이 끝난 뒤에만 "이번 주 빙고판 없음"으로 판단한다.
  const isBingoBoardLoading =
    mySoloRoomsQuery.isLoading ||
    (activeSoloRoom !== null && activeSoloBoardQuery.isLoading);
  const showNoBingoBoardHint =
    !isBingoBoardLoading && rawBingoCells.length === 0;

  const handleBingoCellPress = (cell: BingoBoardCell) => {
    const rawCell = rawBingoCells.find(c => String(c.cellId) === cell.id);
    if (rawCell) {
      setSelectedMission(rawCell.mission);
    }
  };

  // 사용 불가/미허용/조회 실패 시 실측값이 없다는 뜻이므로 가짜 숫자 대신 0을
  // 보여준다.
  const health = useStepDataToday();
  const healthSummary =
    health.data?.status === 'ok' ? health.data.summary : null;
  const todaySteps = healthSummary?.steps ?? 0;
  const todayDistanceKm = healthSummary
    ? Math.round((healthSummary.distanceMeters / 1000) * 10) / 10
    : 0;
  const todayCalories = healthSummary
    ? Math.round(healthSummary.activeCalories)
    : 0;

  return (
    <Screen>
      <View style={styles.content}>
        <HomeHeader
          points={points}
          onProfilePress={() => navigation.navigate('MyPage')}
        />
        <HomeCarousel
          style={styles.carousel}
          steps={todaySteps}
          goalSteps={summary.goalSteps}
          characterName={characterName}
          characterBaseImage={character.data?.baseImage ?? null}
          characterFallbackImage={character.data?.baseImageFallback ?? null}
          characterItems={characterItems}
          distanceKm={todayDistanceKm}
          calories={todayCalories}
          rewardHint={summary.canRewardHint}
          bingoSize={bingoSize}
          bingoCells={bingoCells}
          bingoHint={showNoBingoBoardHint ? NO_BINGO_BOARD_HINT : undefined}
          onBingoCellPress={handleBingoCellPress}
          isWalking={walkSession.isActive}
          walkElapsedLabel={formatElapsed(walkSession.elapsedSeconds)}
          onPressWalkBadge={() => navigation.navigate('WalkSession')}
        />
        <View style={styles.startButtons}>
          <Button
            label="혼자하기"
            size="lg"
            variant="secondary"
            onPress={() => {
              // 이미 진행 중인 산책이 있으면 시트를 다시 고를 필요 없이
              // 그 세션으로 바로 이동한다 — 단, 다른 모드로 진행 중이면
              // 그 화면으로 잘못 들어가지 않도록 막는다.
              if (isWalkSessionActive()) {
                if (!isActiveSessionSolo) {
                  Alert.alert(
                    '진행 중인 산책이 있어요',
                    '다른 모드로 진행 중인 산책을 먼저 종료한 뒤 다시 시도해주세요.',
                  );
                  return;
                }
                navigation.navigate('WalkSession');
                return;
              }
              // 로컬 세션은 끝났어도(예: 산책 종료 후 다시 누름) 서버에 이미
              // 진행 중인 솔로 방이 있으면 새로 만들지 않고 그 방을 그대로
              // 이어서 시작한다 — 단, 빙고판 갱신이 필요하면 먼저 목표를
              // 다시 받는다.
              if (activeSoloRoom && !soloRenewal) {
                startWalkSession(activeSoloRoom.roomId);
                navigation.navigate('WalkSession');
                return;
              }
              setSoloSheetVisible(true);
            }}
            style={styles.startButton}
          />
          <Button
            label="같이하기"
            size="lg"
            onPress={() => {
              if (isWalkSessionActive()) {
                if (isActiveSessionSolo) {
                  Alert.alert(
                    '진행 중인 산책이 있어요',
                    '다른 모드로 진행 중인 산책을 먼저 종료한 뒤 다시 시도해주세요.',
                  );
                  return;
                }
                navigation.navigate('WalkSession');
                return;
              }
              setRoomSheetVisible(true);
            }}
            style={styles.startButton}
          />
        </View>
      </View>

      <WalkRoomSelectSheet
        visible={isRoomSheetVisible}
        onClose={() => setRoomSheetVisible(false)}
        onStart={room => {
          setRoomSheetVisible(false);
          // 이미 진행 중인 세션이 있으면(뒤로가기 후 재진입) 건드리지 않는다.
          // TODO: 실제로는 서버가 내려주는 방의 startedAt을 그대로 쓴다.
          startWalkSession(Number(room.id));
          navigation.navigate('WalkSession');
        }}
        onNeedsRenewal={renewal => {
          setRoomSheetVisible(false);
          setGroupRenewal(renewal);
        }}
      />

      {groupRenewal ? (
        <BoardRenewalSheet
          visible
          onClose={() => setGroupRenewal(null)}
          roomId={groupRenewal.roomId}
          currentTargetStepCount={groupRenewal.targetStepCount}
          currentBoardSize={groupRenewal.boardSize}
          onRenewed={roomId => {
            setGroupRenewal(null);
            startWalkSession(roomId);
            navigation.navigate('WalkSession');
          }}
        />
      ) : null}

      {soloRenewal ? (
        <BoardRenewalSheet
          visible={isSoloSheetVisible}
          onClose={() => setSoloSheetVisible(false)}
          roomId={soloRenewal.roomId}
          currentTargetStepCount={soloRenewal.currentTargetStepCount}
          currentBoardSize={soloRenewal.currentBoardSize}
          onRenewed={roomId => {
            setSoloSheetVisible(false);
            mySoloRoomsQuery.refetch();
            activeSoloBoardQuery.refetch();
            startWalkSession(roomId);
            navigation.navigate('WalkSession');
          }}
        />
      ) : (
        <CreateSoloWalkSheet
          visible={isSoloSheetVisible}
          nickname={characterName}
          onClose={() => setSoloSheetVisible(false)}
          onCreated={roomId => {
            setSoloSheetVisible(false);
            // 방금 만든 방을 다음번 "혼자하기"에서 바로 알아보도록 목록을 새로
            // 받아온다(첫 생성 전에는 활성 솔로 방이 없어 목록이 비어 있었다).
            mySoloRoomsQuery.refetch();
            // 서버가 이미 방을 시작 상태로 만들어 반환하므로, 로컬 세션도 바로 시작
            // 상태로 맞춘다(같이하기 쪽과 동일한 흐름).
            startWalkSession(roomId);
            navigation.navigate('WalkSession');
          }}
        />
      )}

      <MissionInfoModal
        mission={selectedMission}
        onClose={() => setSelectedMission(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  carousel: {
    flex: 1,
  },
  startButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  startButton: {
    flex: 1,
  },
  missionThumbnail: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
  },
});

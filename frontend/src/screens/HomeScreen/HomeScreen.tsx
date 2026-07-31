import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { BingoBoardCell } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { BoardRenewalSheet } from '../../features/bingo/components/BoardRenewalSheet/BoardRenewalSheet';
import { useActiveBingoBoardQuery } from '../../features/bingo/hooks/useActiveBingoBoardQuery';
import { useMyCashQuery } from '../../features/member/hooks/useMyCashQuery';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import { useMyRoomsQuery } from '../../features/room/hooks/useMyRoomsQuery';
import {
  isWalkSessionActive,
  startWalkSession,
} from '../../features/walk-session/model/walkSessionStore';
import { ApiError } from '../../shared/api/ApiError';
import { Screen } from '../../shared/components/Screen/Screen';
import { Button } from '../../shared/components/Button/Button';
import { spacing } from '../../shared/constants/spacing';
import { useSamsungHealthToday } from '../../shared/hooks/useSamsungHealthToday';
import { CreateSoloWalkSheet } from './components/CreateSoloWalkSheet';
import { HomeHeader } from './components/HomeHeader';
import { HomeCarousel } from './components/HomeCarousel';
import { WalkRoomSelectSheet } from './components/WalkRoomSelectSheet';
import characterFemale from './assets/character-female.png';
import characterMale from './assets/character-male.png';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const CHARACTER_IMAGE_BY_GENDER = {
  male: characterMale,
  female: characterFemale,
} as const;

// TODO: 캐릭터 합성(장착 아이템 반영)과 목표 걸음수 연동 전까지의 임시 목업 데이터.
// 걸음/거리/칼로리는 useSamsungHealthToday, 포인트·닉네임은 각각
// useMyCashQuery·useMyCharacterQuery로 실측값을 따로 받아온다.
const MOCK_HOME_SUMMARY = {
  goalSteps: 10000,
  characterGender: 'male' as keyof typeof CHARACTER_IMAGE_BY_GENDER,
  canRewardHint: '1,000보 더 걸으면 캔 1개를 더 모아요',
};

// TODO: 실제 이번 주 빙고판 데이터 연동 전까지의 임시 목업 데이터(5x5).
const MOCK_BINGO_COMPLETED: boolean[] = [
  true, true, false, false, false,
  true, false, false, false, false,
  false, false, true, false, false,
  false, false, false, false, false,
  false, false, false, false, false,
];
const MOCK_BINGO_CELLS: BingoBoardCell[] = MOCK_BINGO_COMPLETED.map(
  (completed, index) => ({ id: String(index), completed }),
);

// 어느 쪽이든 로그아웃은 끝났으므로 그 사실을 먼저 알린다.
const LOGOUT_ALERT_TITLE = '로그아웃했어요';
const SESSION_ALREADY_GONE_MESSAGE = '세션이 이미 만료되어 있었어요.';
const SERVER_UNREACHABLE_MESSAGE =
  '네트워크에 연결되지 않아 서버에는 반영되지 못했어요.';

export function HomeScreen() {
  const summary = MOCK_HOME_SUMMARY;
  const navigation = useNavigation<HomeNavigation>();
  const [isRoomSheetVisible, setRoomSheetVisible] = useState(false);
  const [isSoloSheetVisible, setSoloSheetVisible] = useState(false);
  // 협동 방을 고른 뒤 빙고판 갱신이 필요하고 내가 방장일 때만 채워진다.
  const [groupRenewal, setGroupRenewal] = useState<{
    roomId: number;
    targetStepCount: number | null;
    boardSize: number;
  } | null>(null);
  const logout = useLogoutMutation();
  const isLoggingOut = useRef(false);

  // 로딩/실패 중에는 가짜 숫자·이름 대신 빈 값을 보여준다.
  const cash = useMyCashQuery();
  const points = cash.data?.cash ?? 0;
  const character = useMyCharacterQuery();
  const characterName = character.data?.nickname ?? '';

  // 진행 중인 솔로 방이 이미 있으면(빙고를 다 못 채웠거나 일주일이 안
  // 지났으면 방은 그대로 유지된다) 목표를 다시 입력받지 않고 그 방으로
  // 바로 이어서 들어간다.
  const mySoloRoomsQuery = useMyRoomsQuery('SINGLE');
  const activeSoloRoom = mySoloRoomsQuery.data?.[0] ?? null;

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

  // 사용 불가/미허용/조회 실패 시 실측값이 없다는 뜻이므로 가짜 숫자 대신 0을
  // 보여준다.
  const health = useSamsungHealthToday();
  const healthSummary =
    health.data?.status === 'ok' ? health.data.summary : null;
  const todaySteps = healthSummary?.steps ?? 0;
  const todayDistanceKm = healthSummary
    ? Math.round((healthSummary.distanceMeters / 1000) * 10) / 10
    : 0;
  const todayCalories = healthSummary
    ? Math.round(healthSummary.activeCalories)
    : 0;

  // 로그아웃 진입점은 마이페이지로 옮길 예정이라 지금은 여기서 호출하는 곳이
  // 없다. 마이페이지가 생기면 그쪽 버튼의 onPress로 그대로 옮겨 쓴다.
  // 세션을 정리하면 이 화면이 로그인 화면으로 교체되므로 화면 안 문구로는 알릴 수
  // 없다. catch에서 Alert를 띄우면 react-query 콜백 순서에 기대지 않아도 된다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function requestLogout() {
    // pending 반영에 한 프레임이 걸려, 그 사이의 두 번째 탭은 동기 플래그로 막는다.
    if (isLoggingOut.current) {
      return;
    }
    isLoggingOut.current = true;

    try {
      await logout.mutateAsync();
    } catch (error) {
      Alert.alert(
        LOGOUT_ALERT_TITLE,
        error instanceof ApiError
          ? SESSION_ALREADY_GONE_MESSAGE
          : SERVER_UNREACHABLE_MESSAGE,
      );
    } finally {
      isLoggingOut.current = false;
    }
  }

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
          characterImageSource={CHARACTER_IMAGE_BY_GENDER[summary.characterGender]}
          distanceKm={todayDistanceKm}
          calories={todayCalories}
          rewardHint={summary.canRewardHint}
          bingoSize={5}
          bingoCells={MOCK_BINGO_CELLS}
        />
        <View style={styles.startButtons}>
          <Button
            label="혼자하기"
            size="lg"
            variant="secondary"
            onPress={() => {
              // 이미 진행 중인 산책이 있으면 시트를 다시 고를 필요 없이
              // 그 세션으로 바로 이동한다.
              if (isWalkSessionActive()) {
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
});

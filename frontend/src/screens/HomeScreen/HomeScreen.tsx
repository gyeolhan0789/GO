import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { BingoBoardCell } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { useMyCashQuery } from '../../features/member/hooks/useMyCashQuery';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
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
  const [isRoomSheetVisible, setRoomSheetVisible] = useState(false);
  const [isSoloSheetVisible, setSoloSheetVisible] = useState(false);
  const logout = useLogoutMutation();
  const isLoggingOut = useRef(false);

  // 로딩/실패 중에는 가짜 숫자·이름 대신 빈 값을 보여준다.
  const cash = useMyCashQuery();
  const points = cash.data?.cash ?? 0;
  const character = useMyCharacterQuery();
  const characterName = character.data?.nickname ?? '';

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
        <HomeHeader points={points} />
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
            onPress={() => setSoloSheetVisible(true)}
            style={styles.startButton}
          />
          <Button
            label="같이하기"
            size="lg"
            onPress={() => setRoomSheetVisible(true)}
            style={styles.startButton}
          />
        </View>
      </View>

      <WalkRoomSelectSheet
        visible={isRoomSheetVisible}
        onClose={() => setRoomSheetVisible(false)}
        onStart={() => {
          // TODO: 산책 진행 화면으로 이동. 화면이 아직 없어 선택만 반영하고 닫는다.
          setRoomSheetVisible(false);
        }}
      />

      <CreateSoloWalkSheet
        visible={isSoloSheetVisible}
        nickname={characterName}
        onClose={() => setSoloSheetVisible(false)}
        onCreated={() => {
          setSoloSheetVisible(false);
          // TODO: 산책 진행 화면으로 이동. 화면이 아직 없어 생성만 반영하고 닫는다.
        }}
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
});

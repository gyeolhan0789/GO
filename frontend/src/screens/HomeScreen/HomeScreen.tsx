import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { BingoBoardCell } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { ApiError } from '../../shared/api/ApiError';
import { Screen } from '../../shared/components/Screen/Screen';
import { Button } from '../../shared/components/Button/Button';
import { spacing } from '../../shared/constants/spacing';
import { HomeHeader } from './components/HomeHeader';
import { HomeCarousel } from './components/HomeCarousel';
import { WalkRoomSelectSheet } from './components/WalkRoomSelectSheet';
import characterFemale from './assets/character-female.png';
import characterMale from './assets/character-male.png';

const CHARACTER_IMAGE_BY_GENDER = {
  male: characterMale,
  female: characterFemale,
} as const;

// TODO: 실제 사용자 데이터/캐릭터 커스터마이징 상태 연동 전까지의 임시 목업 데이터.
const MOCK_HOME_SUMMARY = {
  points: 1240,
  todaySteps: 6412,
  goalSteps: 10000,
  todayDistanceKm: 4.2,
  todayCalories: 312,
  characterName: '새싹이',
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
  const logout = useLogoutMutation();
  const isLoggingOut = useRef(false);

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
        <HomeHeader points={summary.points} />
        <HomeCarousel
          style={styles.carousel}
          steps={summary.todaySteps}
          goalSteps={summary.goalSteps}
          characterName={summary.characterName}
          characterImageSource={CHARACTER_IMAGE_BY_GENDER[summary.characterGender]}
          distanceKm={summary.todayDistanceKm}
          calories={summary.todayCalories}
          rewardHint={summary.canRewardHint}
          bingoSize={5}
          bingoCells={MOCK_BINGO_CELLS}
        />
        <Button
          label="산책하기"
          size="lg"
          onPress={() => setRoomSheetVisible(true)}
        />
      </View>

      <WalkRoomSelectSheet
        visible={isRoomSheetVisible}
        onClose={() => setRoomSheetVisible(false)}
        onStart={() => {
          // TODO: 산책 진행 화면으로 이동. 화면이 아직 없어 선택만 반영하고 닫는다.
          setRoomSheetVisible(false);
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
});

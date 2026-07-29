import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AuthSubmitButton } from '../../features/auth/components/AuthSubmitButton';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { ApiError } from '../../shared/api/ApiError';
import { Screen } from '../../shared/components/Screen/Screen';
import { Button } from '../../shared/components/Button/Button';
import { spacing } from '../../shared/constants/spacing';
import { HomeHeader } from './components/HomeHeader';
import { StreakBanner } from './components/StreakBanner';
import { StatsRow } from './components/StatsRow';
import { CharacterCard } from './components/CharacterCard';
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
  streakDays: 7,
  todaySteps: 3200,
  todayCalories: 128,
  todayMinutes: 32,
  characterMessage: '오늘도 가볍게 걸어볼까요?',
  characterGender: 'male' as keyof typeof CHARACTER_IMAGE_BY_GENDER,
};

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

  // 세션을 정리하면 이 화면이 로그인 화면으로 교체되므로 화면 안 문구로는 알릴 수
  // 없다. catch에서 Alert를 띄우면 react-query 콜백 순서에 기대지 않아도 된다.
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
        <StreakBanner streakDays={summary.streakDays} />
        <StatsRow
          steps={summary.todaySteps}
          calories={summary.todayCalories}
          minutes={summary.todayMinutes}
        />
        <CharacterCard
          style={styles.characterCard}
          message={summary.characterMessage}
          characterImageSource={
            CHARACTER_IMAGE_BY_GENDER[summary.characterGender]
          }
        />
        <Button
          label="산책 시작하기"
          icon="walk"
          size="lg"
          onPress={() => setRoomSheetVisible(true)}
        />
        {/* 임시 배치. 마이페이지가 생기면 그쪽으로 옮긴다. */}
        <View style={styles.logout}>
          <AuthSubmitButton
            label="로그아웃"
            onPress={requestLogout}
            pending={logout.isPending}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  characterCard: {
    flex: 1,
  },
  logout: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
});

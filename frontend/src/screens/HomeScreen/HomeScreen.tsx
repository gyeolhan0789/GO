import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import type { BingoBoardCell } from '../../features/bingo/components/BingoBoard/BingoBoard';
import { useMyCashQuery } from '../../features/member/hooks/useMyCashQuery';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import {
  isWalkSessionActive,
  startWalkSession,
} from '../../features/walk-session/model/walkSessionStore';
import { Screen } from '../../shared/components/Screen/Screen';
import { Button } from '../../shared/components/Button/Button';
import { spacing } from '../../shared/constants/spacing';
import { useSamsungHealthToday } from '../../shared/hooks/useSamsungHealthToday';
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

export function HomeScreen() {
  const summary = MOCK_HOME_SUMMARY;
  const navigation = useNavigation<HomeNavigation>();
  const [isRoomSheetVisible, setRoomSheetVisible] = useState(false);

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
        <Button
          label="산책하기"
          size="lg"
          onPress={() => {
            // 이미 진행 중인 산책이 있으면 방 목록을 다시 고를 필요 없이
            // 그 세션으로 바로 이동한다.
            if (isWalkSessionActive()) {
              navigation.navigate('WalkSession');
              return;
            }
            setRoomSheetVisible(true);
          }}
        />
      </View>

      <WalkRoomSelectSheet
        visible={isRoomSheetVisible}
        onClose={() => setRoomSheetVisible(false)}
        onStart={() => {
          setRoomSheetVisible(false);
          // 이미 진행 중인 세션이 있으면(뒤로가기 후 재진입) 건드리지 않는다.
          // TODO: 실제로는 서버가 내려주는 방의 startedAt을 그대로 쓴다.
          startWalkSession();
          // TODO: 선택한 room의 roomId를 파라미터로 넘긴다. 아직 실제 방 목록
          // API가 없어(mock) 넘길 값이 없다.
          navigation.navigate('WalkSession');
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

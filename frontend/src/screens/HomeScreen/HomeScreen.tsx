import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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

export function HomeScreen() {
  const summary = MOCK_HOME_SUMMARY;
  const [isRoomSheetVisible, setRoomSheetVisible] = useState(false);

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
});

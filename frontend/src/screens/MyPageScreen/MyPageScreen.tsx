import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { CharacterPreview } from '../../features/member/components/CharacterPreview';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import { useUpdateProfileMutation } from '../../features/member/hooks/useUpdateProfileMutation';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../features/member/model/equippedItems';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { Button } from '../../shared/components/Button/Button';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import { textStyles } from '../../shared/constants/typography';
import { ChangeCharacterButton } from './components/ChangeCharacterButton';
import { NicknameField } from './components/NicknameField';

type MyPageScreenProps = NativeStackScreenProps<RootStackParamList, 'MyPage'>;

// 백엔드 `MemberValidationRules`와 같은 값. 여기서 막지 않으면 저장 순간에야
// 400을 보게 된다.
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;
const NICKNAME_LENGTH_MESSAGE = `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`;
const NICKNAME_SAVED_MESSAGE = '닉네임을 변경했어요';

const SCREEN_EDGES = ['bottom'] as const;

export function MyPageScreen({ navigation }: MyPageScreenProps) {
  const character = useMyCharacterQuery();
  const updateProfile = useUpdateProfileMutation();
  // null이면 아직 손대지 않았다는 뜻이라 서버 값을 그대로 보여준다. 이렇게 두면
  // 조회가 늦게 끝나도 입력값을 effect로 덮어쓰지 않는다.
  const [draftNickname, setDraftNickname] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const savedNickname = character.data?.nickname ?? '';
  const nickname = draftNickname ?? savedNickname;
  const trimmedNickname = nickname.trim();
  const isNicknameChanged = trimmedNickname !== savedNickname;
  const isNicknameValid =
    trimmedNickname.length >= NICKNAME_MIN_LENGTH &&
    trimmedNickname.length <= NICKNAME_MAX_LENGTH;

  const equippedItems = selectLayerItems(
    toEquippedByCategory(character.data?.equippedItems ?? []),
  );

  const hideToast = useCallback(() => setToastMessage(null), []);

  function saveNickname() {
    updateProfile.mutate(trimmedNickname, {
      onSuccess: () => {
        setDraftNickname(null);
        setToastMessage(NICKNAME_SAVED_MESSAGE);
      },
    });
  }

  // 길이 미달은 입력 중에 계속 빨갛게 뜨면 성가시므로, 서버가 거절한 이유만 띄운다.
  const nicknameError = updateProfile.isError
    ? resolveApiErrorMessage(updateProfile.error)
    : undefined;

  return (
    <Screen edges={SCREEN_EDGES}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.characterCard}>
            <CharacterPreview
              baseImage={character.data?.baseImage ?? null}
              items={equippedItems}
              style={styles.preview}
            />
            <ChangeCharacterButton
              onPress={() => navigation.navigate('CharacterCustomize')}
            />
          </Card>

          {character.isError ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {resolveApiErrorMessage(character.error)}
            </Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            <NicknameField
              value={nickname}
              onChangeText={text => {
                setDraftNickname(text);
                updateProfile.reset();
              }}
              maxLength={NICKNAME_MAX_LENGTH}
              error={nicknameError}
            />
            <Text style={styles.hint}>{NICKNAME_LENGTH_MESSAGE}</Text>
          </View>

          <Button
            label={updateProfile.isPending ? '저장 중...' : '저장하기'}
            onPress={saveNickname}
            disabled={
              !isNicknameChanged || !isNicknameValid || updateProfile.isPending
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast message={toastMessage} onHide={hideToast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  characterCard: {
    // 배경이 카드 안쪽 모서리까지 닿도록 카드 기본 패딩을 좁힌다.
    padding: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  preview: {
    alignSelf: 'stretch',
    borderRadius: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...textStyles.heading2,
    color: colors.ink,
  },
  hint: {
    ...textStyles.caption,
    color: colors.ink,
    opacity: 0.5,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.danger,
  },
});

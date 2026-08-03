import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { GenderSelector } from '../../features/auth/components/GenderSelector';
import { RegionDropdown } from '../../features/auth/components/RegionDropdown';
import type { Gender } from '../../features/auth/constants/genders';
import type { Region } from '../../features/auth/constants/regions';
import { useLogoutMutation } from '../../features/auth/hooks/useLogoutMutation';
import { CharacterPreview } from '../../features/member/components/CharacterPreview';
import { useMyCharacterQuery } from '../../features/member/hooks/useMyCharacterQuery';
import { useMyPageQuery } from '../../features/member/hooks/useMyPageQuery';
import { useUpdateProfileMutation } from '../../features/member/hooks/useUpdateProfileMutation';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../features/member/model/equippedItems';
import { ApiError } from '../../shared/api/ApiError';
import { resolveApiErrorMessage } from '../../shared/api/resolveApiErrorMessage';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { Toast } from '../../shared/components/Toast/Toast';
import { colors } from '../../shared/constants/colors';
import { spacing } from '../../shared/constants/spacing';
import {
  fontFamily,
  lineHeights,
  textStyles,
} from '../../shared/constants/typography';
import { ChangeCharacterButton } from './components/ChangeCharacterButton';
import { FriendRequestsMenuRow } from './components/FriendRequestsMenuRow';
import { NicknameField } from './components/NicknameField';

type MyPageScreenProps = NativeStackScreenProps<RootStackParamList, 'MyPage'>;

// 백엔드 `MemberValidationRules`와 같은 값. 여기서 막지 않으면 저장 순간에야
// 400을 보게 된다.
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;
const NICKNAME_LENGTH_MESSAGE = `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`;
const PROFILE_SAVED_MESSAGE = '프로필을 저장했어요';

// 어느 쪽이든 로그아웃은 끝났으므로 그 사실을 먼저 알린다.
const LOGOUT_ALERT_TITLE = '로그아웃했어요';
const SESSION_ALREADY_GONE_MESSAGE = '세션이 이미 만료되어 있었어요.';
const SERVER_UNREACHABLE_MESSAGE =
  '네트워크에 연결되지 않아 서버에는 반영되지 못했어요.';

const SCREEN_EDGES = ['bottom'] as const;

export function MyPageScreen({ navigation }: MyPageScreenProps) {
  const character = useMyCharacterQuery();
  const myPage = useMyPageQuery();
  const updateProfile = useUpdateProfileMutation();
  const logout = useLogoutMutation();
  const isLoggingOut = useRef(false);
  // null이면 아직 손대지 않았다는 뜻이라 서버 값을 그대로 보여준다. 이렇게 두면
  // 조회가 늦게 끝나도 입력값을 effect로 덮어쓰지 않는다.
  const [draftNickname, setDraftNickname] = useState<string | null>(null);
  const [draftGender, setDraftGender] = useState<Gender | null>(null);
  const [draftRegion, setDraftRegion] = useState<Region | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const savedNickname = character.data?.nickname ?? '';
  const nickname = draftNickname ?? savedNickname;
  const trimmedNickname = nickname.trim();
  const isNicknameChanged = trimmedNickname !== savedNickname;
  const isNicknameValid =
    trimmedNickname.length >= NICKNAME_MIN_LENGTH &&
    trimmedNickname.length <= NICKNAME_MAX_LENGTH;

  const savedGender = myPage.data?.gender ?? null;
  const gender = draftGender ?? savedGender;
  const isGenderChanged = gender !== null && gender !== savedGender;

  const savedRegion = myPage.data?.region ?? null;
  const region = draftRegion ?? savedRegion;
  const isRegionChanged = region !== null && region !== savedRegion;

  const isProfileChanged =
    isNicknameChanged || isGenderChanged || isRegionChanged;

  const equippedItems = selectLayerItems(
    toEquippedByCategory(character.data?.equippedItems ?? []),
  );

  const hideToast = useCallback(() => setToastMessage(null), []);

  function saveProfile() {
    updateProfile.mutate(
      {
        nickname: isNicknameChanged ? trimmedNickname : undefined,
        gender: isGenderChanged ? gender ?? undefined : undefined,
        region: isRegionChanged ? region ?? undefined : undefined,
      },
      {
        onSuccess: () => {
          setDraftNickname(null);
          setDraftGender(null);
          setDraftRegion(null);
          setToastMessage(PROFILE_SAVED_MESSAGE);
        },
      },
    );
  }

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
            <AppText style={styles.errorText} accessibilityLiveRegion="polite">
              {resolveApiErrorMessage(character.error)}
            </AppText>
          ) : null}

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>기본 정보</AppText>
            <NicknameField
              value={nickname}
              onChangeText={text => {
                setDraftNickname(text);
                updateProfile.reset();
              }}
              maxLength={NICKNAME_MAX_LENGTH}
              error={nicknameError}
            />
            <AppText style={styles.hint}>{NICKNAME_LENGTH_MESSAGE}</AppText>

            <AppText style={styles.fieldLabel}>성별</AppText>
            <GenderSelector
              selected={gender}
              onSelect={value => {
                setDraftGender(value);
                updateProfile.reset();
              }}
            />

            <AppText style={styles.fieldLabel}>지역</AppText>
            <RegionDropdown
              selected={region}
              onSelect={value => {
                setDraftRegion(value);
                updateProfile.reset();
              }}
            />

            {myPage.isError ? (
              <AppText
                style={styles.errorText}
                accessibilityLiveRegion="polite"
              >
                {resolveApiErrorMessage(myPage.error)}
              </AppText>
            ) : null}
          </View>

          <Button
            label={updateProfile.isPending ? '저장 중...' : '저장하기'}
            onPress={saveProfile}
            disabled={
              !isProfileChanged || !isNicknameValid || updateProfile.isPending
            }
          />

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>친구</AppText>
            <FriendRequestsMenuRow
              onPress={() => navigation.navigate('SentFriendRequests')}
            />
          </View>

          <Button
            label={logout.isPending ? '로그아웃 중...' : '로그아웃'}
            accessibilityLabel="로그아웃"
            variant="secondary"
            onPress={requestLogout}
            disabled={logout.isPending}
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
  fieldLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
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

import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { SocialProvider } from '../constants/socialProviders';
import { GoogleLogo } from './GoogleLogo';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type SocialAuthButtonsProps = {
  onKakaoPress: () => void;
  onGooglePress: () => void;
  /** 버튼 문구 접미사. 기본 '시작하기'. 로그인 화면은 '로그인'을 전달한다. */
  action?: string;
  /**
   * 진행 중인 제공자. 값이 있으면 두 버튼을 모두 잠가 창이 뜨는 동안 중복
   * 요청이 나가지 않게 한다.
   */
  pendingProvider?: SocialProvider | null;
};

const PENDING_LABEL = '연결 중…';

const KAKAO_BG = '#FEE500';
const KAKAO_LABEL = '#191600';
const GOOGLE_BG = '#FFFFFF';
const GOOGLE_BORDER = colors.border;
const GOOGLE_LABEL = colors.inkSoft;

const BUTTON_HEIGHT = 52;
const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

export function SocialAuthButtons({
  onKakaoPress,
  onGooglePress,
  action = '시작하기',
  pendingProvider = null,
}: SocialAuthButtonsProps) {
  const isBusy = pendingProvider !== null;
  const kakaoLabel =
    pendingProvider === 'KAKAO' ? PENDING_LABEL : `카카오로 ${action}`;
  const googleLabel =
    pendingProvider === 'GOOGLE' ? PENDING_LABEL : `Google로 ${action}`;

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.kakao,
          pressed ? styles.pressed : null,
          isBusy ? styles.disabled : null,
        ]}
        onPress={onKakaoPress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={kakaoLabel}
        accessibilityState={{ disabled: isBusy }}
      >
        <Ionicons name="chatbubble-sharp" size={18} color={KAKAO_LABEL} />
        <AppText style={[styles.label, styles.kakaoLabel]}>{kakaoLabel}</AppText>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.google,
          pressed ? styles.pressed : null,
          isBusy ? styles.disabled : null,
        ]}
        onPress={onGooglePress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={googleLabel}
        accessibilityState={{ disabled: isBusy }}
      >
        <GoogleLogo size={20} />
        <AppText style={[styles.label, styles.googleLabel]}>{googleLabel}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    height: BUTTON_HEIGHT,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  kakao: {
    backgroundColor: KAKAO_BG,
  },
  google: {
    backgroundColor: GOOGLE_BG,
    borderWidth: 1,
    borderColor: GOOGLE_BORDER,
  },
  label: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
  },
  kakaoLabel: {
    color: KAKAO_LABEL,
  },
  googleLabel: {
    color: GOOGLE_LABEL,
  },
});

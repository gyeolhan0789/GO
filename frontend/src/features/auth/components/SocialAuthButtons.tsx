import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { GoogleLogo } from './GoogleLogo';

type SocialAuthButtonsProps = {
  onKakaoPress: () => void;
  onGooglePress: () => void;
  /** 버튼 문구 접미사. 기본 '시작하기'. 로그인 화면은 '로그인'을 전달한다. */
  action?: string;
};

const KAKAO_BG = '#FEE500';
const KAKAO_LABEL = '#191600';
const GOOGLE_BG = '#FFFFFF';
const GOOGLE_BORDER = '#D1D5DB';
const GOOGLE_LABEL = '#374151';

const BUTTON_HEIGHT = 52;
const PRESSED_OPACITY = 0.85;

export function SocialAuthButtons({
  onKakaoPress,
  onGooglePress,
  action = '시작하기',
}: SocialAuthButtonsProps) {
  const kakaoLabel = `카카오로 ${action}`;
  const googleLabel = `Google로 ${action}`;

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.kakao,
          pressed ? styles.pressed : null,
        ]}
        onPress={onKakaoPress}
        accessibilityRole="button"
        accessibilityLabel={kakaoLabel}
      >
        <Ionicons name="chatbubble-sharp" size={18} color={KAKAO_LABEL} />
        <Text style={[styles.label, styles.kakaoLabel]}>{kakaoLabel}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.google,
          pressed ? styles.pressed : null,
        ]}
        onPress={onGooglePress}
        accessibilityRole="button"
        accessibilityLabel={googleLabel}
      >
        <GoogleLogo size={20} />
        <Text style={[styles.label, styles.googleLabel]}>{googleLabel}</Text>
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
  kakao: {
    backgroundColor: KAKAO_BG,
  },
  google: {
    backgroundColor: GOOGLE_BG,
    borderWidth: 1,
    borderColor: GOOGLE_BORDER,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  kakaoLabel: {
    color: KAKAO_LABEL,
  },
  googleLabel: {
    color: GOOGLE_LABEL,
  },
});

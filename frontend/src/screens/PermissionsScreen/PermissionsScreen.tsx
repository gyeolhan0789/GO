import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import {
  checkPermission,
  openAppSettings,
  PERMISSION_KEYS,
  REQUIRED_PERMISSION_KEYS,
  requestAllPermissions,
  type PermissionKey,
  type PermissionResult,
} from '../../shared/lib/permissions';
import { usePermissionsStatus } from '../../shared/hooks/usePermissionsStatus';
import { PermissionCard } from './components/PermissionCard';
import { AppText } from '../../shared/components/AppText/AppText';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
import {
  bodyFont,
  fontFamily,
  lineHeights,
} from '../../shared/constants/typography';

type PermissionsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'Permissions'
>;

type PermissionCardData = {
  key: PermissionKey;
  icon: IoniconsIconName;
  title: string;
  description: string;
};

const PERMISSION_CARDS: PermissionCardData[] = [
  {
    key: 'camera',
    icon: 'camera-outline',
    title: '카메라',
    description: '미션 사진을 찍어 인증할 때 사용해요.',
  },
  {
    key: 'activityRecognition',
    icon: 'walk-outline',
    title: '걸음 수',
    description: '산책 중 걸음 수를 측정해요.',
  },
  {
    key: 'location',
    icon: 'location-outline',
    title: '위치',
    description: '산책 경로를 지도에 표시할 때 사용해요.',
  },
  {
    key: 'notifications',
    icon: 'notifications-outline',
    title: '알림 (선택)',
    description: '미션·빙고 소식과 잠금화면 활동 현황을 알려드려요.',
  },
];

export function PermissionsScreen() {
  const navigation = useNavigation<PermissionsNavigation>();
  const { complete } = usePermissionsStatus();

  const [results, setResults] = useState<
    Partial<Record<PermissionKey, PermissionResult>>
  >({});
  const [requested, setRequested] = useState(false);
  // 완료 저장이 끝날 때까지 시작하기를 눌린 상태로 둔다. 이동한 뒤 화면이
  // 사라지므로 다시 false로 되돌릴 필요는 없다. 상태는 렌더 시점 값이라 같은
  // 프레임에 두 번 눌리면 가드를 둘 다 통과하므로, 재진입 판단은 ref로 한다.
  const [isStarting, setIsStarting] = useState(false);
  const isStartingRef = useRef(false);

  // 진입 게이트는 필수 런타임 권한 기준. 알림은 선택이라 빠진다.
  const allGranted = REQUIRED_PERMISSION_KEYS.every(
    key => results[key] === 'granted',
  );
  const anyBlocked = REQUIRED_PERMISSION_KEYS.some(
    key => results[key] === 'blocked',
  );

  // 이미 허용된 권한을 반영한다(재진입/설정에서 허용 후 복귀 포함).
  const refreshStatuses = useCallback(async () => {
    const entries = await Promise.all(
      PERMISSION_KEYS.map(
        async key => [key, await checkPermission(key)] as const,
      ),
    );
    setResults(prev => {
      const next = { ...prev };
      for (const [key, granted] of entries) {
        if (granted) {
          next[key] = 'granted';
        } else if (next[key] === 'granted') {
          next[key] = 'denied';
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refreshStatuses();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshStatuses();
      }
    });
    return () => subscription.remove();
  }, [refreshStatuses]);

  // 권한 허용 이후 로그인으로 이동한다. reset이라 뒤로가기로 권한 화면에
  // 되돌아올 수 없고, 로그인 화면에도 뒤로가기가 남지 않는다.
  const goToLogin = useCallback(async () => {
    // 저장이 끝나기 전에 또 눌리면 reset이 두 번 불린다.
    if (isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;
    setIsStarting(true);
    // 저장이 실패해도 진행은 막지 않는다. 다음 실행에서 이 화면을 한 번 더 보게
    // 될 뿐이고(권한은 이미 허용돼 있어 바로 넘어간다), 여기서 세워두는 편이 더
    // 나쁘다.
    await complete().catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [complete, navigation]);

  const handleRequest = useCallback(async () => {
    setResults(await requestAllPermissions());
    setRequested(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>
          원활한 이용을 위해{'\n'}권한을 허용해 주세요
        </AppText>
        <AppText style={styles.subtitle}>
          아래 권한은 서비스 이용에 꼭 필요해요.
        </AppText>

        <View style={styles.cards}>
          {PERMISSION_CARDS.map(card => (
            <PermissionCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              description={card.description}
              status={results[card.key]}
            />
          ))}
        </View>

        {requested && !allGranted ? (
          <AppText style={styles.blockedNotice}>
            {anyBlocked
              ? '권한에 동의하지 않으면 서비스를 이용할 수 없어요. 기기 설정에서 권한을 허용해 주세요.'
              : '권한에 동의하지 않으면 서비스를 이용할 수 없어요. 모든 권한을 허용해 주세요.'}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {allGranted ? (
          <Pressable
            onPress={goToLogin}
            disabled={isStarting}
            accessibilityRole="button"
            accessibilityLabel="시작하기"
            accessibilityState={{ disabled: isStarting, busy: isStarting }}
            style={styles.primaryButton}
          >
            {isStarting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <AppText style={styles.primaryText}>시작하기</AppText>
            )}
          </Pressable>
        ) : anyBlocked ? (
          <Pressable
            onPress={openAppSettings}
            accessibilityRole="button"
            accessibilityLabel="설정에서 권한 허용"
            style={styles.primaryButton}
          >
            <AppText style={styles.primaryText}>설정에서 권한 허용</AppText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleRequest}
            accessibilityRole="button"
            accessibilityLabel="권한 허용하기"
            style={styles.primaryButton}
          >
            <AppText style={styles.primaryText}>권한 허용하기</AppText>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.ink,
    lineHeight: lineHeights[24],
  },
  subtitle: {
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedStrong,
    marginTop: 12,
    marginBottom: 28,
  },
  cards: {
    alignSelf: 'stretch',
  },
  blockedNotice: {
    fontFamily: bodyFont.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  primaryButton: {
    height: controlHeight.lg,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: bodyFont.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.surface,
  },
});

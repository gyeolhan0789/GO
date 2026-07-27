import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  requestAllPermissions,
  type PermissionKey,
  type PermissionResult,
} from '../../shared/lib/permissions';
import {
  hasSamsungHealthPermissions,
  isSamsungHealthAvailable,
  requestSamsungHealthPermissions,
} from '../../shared/lib/samsungHealth';
// 개발 단계: 권한 완료 저장 비활성화로 잠시 미사용.
// TODO(권한 게이트 복구): 아래 import/complete 주석 해제.
// import { usePermissionsStatus } from '../../shared/hooks/usePermissionsStatus';
import { PermissionCard } from './components/PermissionCard';

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
    title: '알림',
    description: '미션·빙고 소식과 잠금화면 활동 현황을 알려드려요.',
  },
];

export function PermissionsScreen() {
  const navigation = useNavigation<PermissionsNavigation>();
  // const { complete } = usePermissionsStatus();

  const [results, setResults] = useState<
    Partial<Record<PermissionKey, PermissionResult>>
  >({});
  const [requested, setRequested] = useState(false);
  // 삼성헬스(건강 데이터)는 자체 권한 모델이라 상태를 따로 추적한다.
  const [healthAvailable] = useState(isSamsungHealthAvailable());
  const [healthGranted, setHealthGranted] = useState(false);

  // 진입 게이트는 표준 런타임 권한 기준. 삼성헬스는 갤럭시/개발자모드 의존이라
  // 게이트에 포함하지 않고(막히지 않게) 요청·표시만 한다.
  const allGranted = PERMISSION_KEYS.every(key => results[key] === 'granted');
  const anyBlocked = PERMISSION_KEYS.some(key => results[key] === 'blocked');

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

    if (isSamsungHealthAvailable()) {
      setHealthGranted(await hasSamsungHealthPermissions());
    }
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
  const goToLogin = useCallback(() => {
    // 개발 단계: 완료 저장 생략. TODO(권한 게이트 복구): await complete(); 복원.
    // await complete();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const handleRequest = useCallback(async () => {
    const next = await requestAllPermissions();
    setResults(next);

    // 삼성헬스 권한은 자체 UI(삼성헬스 팝업)로 요청한다(사용 가능할 때만).
    if (isSamsungHealthAvailable()) {
      setHealthGranted(await requestSamsungHealthPermissions());
    }

    setRequested(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          원활한 이용을 위해{'\n'}권한을 허용해 주세요
        </Text>
        <Text style={styles.subtitle}>
          아래 권한은 서비스 이용에 꼭 필요해요.
        </Text>

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
          <PermissionCard
            icon="fitness-outline"
            title="건강 데이터"
            description={
              healthAvailable
                ? '걸음·거리·칼로리를 삼성헬스에서 가져와 표시할 때 사용해요.'
                : '삼성헬스(갤럭시)에서만 사용할 수 있어요.'
            }
            status={
              healthGranted ? 'granted' : requested ? 'denied' : undefined
            }
          />
        </View>

        {requested && !allGranted ? (
          <Text style={styles.blockedNotice}>
            {anyBlocked
              ? '권한에 동의하지 않으면 서비스를 이용할 수 없어요. 기기 설정에서 권한을 허용해 주세요.'
              : '권한에 동의하지 않으면 서비스를 이용할 수 없어요. 모든 권한을 허용해 주세요.'}
          </Text>
        ) : (
          <Text style={styles.requiredNote}>
            * 모든 권한에 동의해야 Go! 서비스를 이용할 수 있어요.
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {allGranted ? (
          <Pressable
            onPress={goToLogin}
            accessibilityRole="button"
            accessibilityLabel="시작하기"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>시작하기</Text>
          </Pressable>
        ) : anyBlocked ? (
          <Pressable
            onPress={openAppSettings}
            accessibilityRole="button"
            accessibilityLabel="설정에서 권한 허용"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>설정에서 권한 허용</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleRequest}
            accessibilityRole="button"
            accessibilityLabel="권한 허용하기"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>권한 허용하기</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 24,
    color: '#111827',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'NotoSansKR-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 28,
  },
  cards: {
    alignSelf: 'stretch',
  },
  requiredNote: {
    fontFamily: 'NotoSansKR-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 4,
  },
  blockedNotice: {
    fontFamily: 'NotoSansKR-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#DC2626',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2C6A47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 17,
    color: '#ffffff',
  },
});

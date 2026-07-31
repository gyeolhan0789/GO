/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { KeychainMock } from '../jest/keychainMock';
import { AuthProvider } from '../src/features/auth/model/AuthContext';
import { LoginScreen } from '../src/screens/LoginScreen/LoginScreen';
import { SocialSignupScreen } from '../src/screens/SocialSignupScreen/SocialSignupScreen';
import { setAccessToken } from '../src/shared/api/accessTokenStore';

jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);
const keychain: KeychainMock = jest.requireMock('react-native-keychain');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const {
  clearAllMockStorages,
} = require('@react-native-async-storage/async-storage/jest');

// 카카오로 검증하는 이유: Google 경로는 빌드 시점에 인라인되는 `@env`의
// 클라이언트 ID를 요구한다. 신규/기존 분기는 제공자와 무관하게 같은 코드다.
// (factory 없이 부르면 루트 `__mocks__`의 수동 목이 쓰인다.)
jest.mock('@react-native-seoul/kakao-login');

// 위치 권한이 없는 기기를 흉내낸다. 지역 자동 채움이 꺼져서 드롭다운으로 고르는
// 경로를 검증할 수 있다.
jest.mock('../src/shared/lib/permissions', () => ({
  PERMISSION_KEYS: ['camera', 'activityRecognition', 'location', 'notifications'],
  checkPermission: jest.fn(() => Promise.resolve(false)),
  areAllPermissionsGranted: jest.fn(() => Promise.resolve(false)),
  requestAllPermissions: jest.fn(),
  requestPermission: jest.fn(() => Promise.resolve(false)),
  openAppSettings: jest.fn(),
}));
const kakao = jest.requireMock('@react-native-seoul/kakao-login');

const KAKAO_ID_TOKEN = 'kakao-id-token';
const KAKAO_PROFILE = { id: 12345, nickname: '카카오닉', name: '카카오본명' };
const SIGNUP_TOKEN = 'signup-token-uuid';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const navigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };

let fetchMock: FetchMock;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
  fetchMock = installFetchMock();
  setAccessToken(null);
  clearAllMockStorages();
  navigation.navigate.mockClear();
  navigation.goBack.mockClear();
  keychain.setGenericPassword.mockClear();

  kakao.login.mockReset();
  kakao.getProfile.mockReset();
  kakao.login.mockResolvedValue({ idToken: KAKAO_ID_TOKEN });
  kakao.getProfile.mockResolvedValue(KAKAO_PROFILE);
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

/** SDK 호출 -> 저장소 조회 -> 네트워크로 이어지는 체인이 다 풀리도록 flush 한다. */
async function flushAsync() {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function callsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => url.includes(path));
}

function parseBody(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body));
}

async function render(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={client}>
          <AuthProvider>{element}</AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  await flushAsync();
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function renderLogin() {
  return render(
    // 화면은 navigation prop만 사용한다. 나머지 props는 테스트에서 불필요.
    <LoginScreen
      navigation={navigation as never}
      route={{ key: 'Login', name: 'Login' } as never}
    />,
  );
}

function renderSocialSignup() {
  return render(
    <SocialSignupScreen
      navigation={navigation as never}
      route={
        {
          key: 'SocialSignup',
          name: 'SocialSignup',
          params: {
            provider: 'KAKAO',
            signupToken: SIGNUP_TOKEN,
            suggestedName: KAKAO_PROFILE.nickname,
          },
        } as never
      }
    />,
  );
}

async function press(root: ReactTestInstance, label: string) {
  const target = root.find(node => node.props.accessibilityLabel === label);
  await act(async () => {
    target.props.onPress();
  });
  await flushAsync();
}

describe('소셜 로그인', () => {
  test('서버가 가입이 필요하다고 하면 프로필 입력 화면으로 보낸다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        status: 'SIGNUP_REQUIRED',
        accessToken: null,
        refreshToken: null,
        signupToken: SIGNUP_TOKEN,
      }),
    );

    const tree = await renderLogin();

    await press(tree.root, '카카오로 로그인');

    // 검증 요청에는 idToken만 실린다.
    const [[, init]] = callsTo('/auth/oauth/kakao');
    expect(parseBody(init)).toEqual({ idToken: KAKAO_ID_TOKEN });

    expect(navigation.navigate).toHaveBeenCalledWith('SocialSignup', {
      provider: 'KAKAO',
      signupToken: SIGNUP_TOKEN,
      suggestedName: KAKAO_PROFILE.nickname,
    });
    // 아직 회원이 만들어지지 않았으므로 세션도 시작하지 않는다.
    expect(keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  test('가입된 계정이면 입력 화면 없이 바로 로그인한다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        status: 'LOGIN',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        signupToken: null,
      }),
    );

    const tree = await renderLogin();

    await press(tree.root, '카카오로 로그인');

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(keychain.setGenericPassword).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.anything(),
    );
  });

  test('사용자가 로그인 창을 닫으면 에러 문구를 띄우지 않는다', async () => {
    kakao.login.mockRejectedValue(new Error('User cancelled login.'));

    const tree = await renderLogin();

    await press(tree.root, '카카오로 로그인');

    expect(collectTexts(tree.root)).not.toContain('User cancelled login.');
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(callsTo('/auth/oauth/kakao')).toHaveLength(0);
  });

  test('신규 가입은 고른 닉네임·지역·성별을 반영한 뒤 세션을 시작한다', async () => {
    fetchMock.mockImplementation(async url =>
      url.includes('/auth/oauth/kakao/signup')
        ? jsonResponse(200, {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          })
        : jsonResponse(204),
    );

    const tree = await renderSocialSignup();

    // 제공자가 준 이름이 기본값으로 채워진다.
    const nicknameField = tree.root.find(
      node => node.props.value === KAKAO_PROFILE.nickname,
    );
    await act(async () => {
      nicknameField.props.onChangeText('산책왕');
    });
    // 지역은 드롭다운을 열어 고른다(위치 권한이 없으면 자동 채움이 안 되므로).
    await press(tree.root, '지역을 선택하세요');
    await press(tree.root, '서울');
    await press(tree.root, '여성');
    await press(tree.root, '가입 완료');

    // 가입 요청에는 가입 토큰과 성별만 실린다.
    const [[, signupInit]] = callsTo('/auth/oauth/kakao/signup');
    expect(parseBody(signupInit)).toEqual({
      signupToken: SIGNUP_TOKEN,
      gender: 'FEMALE',
    });

    // 닉네임은 서버가 소셜 계정 이름으로 채우므로, 방금 받은 토큰으로 고쳐준다.
    const [[, patchInit]] = callsTo('/members/me');
    expect(patchInit?.method).toBe('PATCH');
    expect(parseBody(patchInit)).toEqual({
      nickname: '산책왕',
      region: 'SEOUL',
    });
    expect(
      (patchInit?.headers as Record<string, string>).Authorization,
    ).toBe('Bearer new-access-token');

    // 프로필까지 반영된 다음에야 세션이 시작된다.
    expect(keychain.setGenericPassword).toHaveBeenCalledWith(
      'refreshToken',
      'new-refresh-token',
      expect.anything(),
    );
  });
});

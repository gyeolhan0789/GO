/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { RootStackParamList } from '../src/app/navigation/RootNavigator';
import { AuthProvider } from '../src/features/auth/model/AuthContext';
import { CHARACTER_QUERY_KEY } from '../src/features/member/hooks/useMyCharacterQuery';
import {
  MOCK_CHARACTER,
  MOCK_OWNED_ITEMS,
  USE_MOCK_CHARACTER,
} from '../src/features/member/mocks/characterMocks';
import type { Character } from '../src/features/member/model/character';
import { CharacterCustomizeScreen } from '../src/screens/CharacterCustomizeScreen/CharacterCustomizeScreen';
import { MyPageScreen } from '../src/screens/MyPageScreen/MyPageScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

// 목업 모드에서도 닉네임은 서버 값을 쓴다. 캐릭터 조회 응답에 아이템 이미지가
// 없더라도(지금 dev 서버 상태) 미리보기는 번들 에셋으로 채워져야 한다.
const SERVER_NICKNAME = '덕맨';
const CHARACTER_RESPONSE = {
  memberId: 1,
  nickname: SERVER_NICKNAME,
  defaultImageUrl: null,
  equippedItems: [],
};

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 마이페이지의 로그아웃 버튼이 useAuth를 타므로 AuthProvider가 필요하다. 저장된
// 리프레시 토큰이 없는 기기라 세션 복구는 요청 없이 끝난다.
jest.mock('react-native-keychain', () =>
  require('../jest/keychainMock').createKeychainMock(),
);

function findMockItem(name: string) {
  const item = MOCK_OWNED_ITEMS.find(candidate => candidate.name === name);

  if (!item) {
    throw new Error(`${name} 목업 아이템이 없다.`);
  }
  return item;
}

const JUNGLE_HAT = findMockItem('정글모');
const FLEECE = findMockItem('플리스');

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/members/character')) {
      return jsonResponse(200, CHARACTER_RESPONSE);
    }
    throw new Error(`목업 모드에서는 나가지 않아야 하는 요청: ${url}`);
  });
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 안 비우면 react-query gc 타이머가 살아남아 워커가 안 죽는다.
  queryClient?.clear();
  queryClient = null;
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

/** 공용 `Button`은 접근성 라벨 대신 자식 Text로 이름을 드러낸다. */
function findButtonByText(root: ReactTestInstance, text: string) {
  let current: ReactTestInstance | null = root.find(
    node => node.type === Text && node.props.children === text,
  ).parent;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error(`${text} 버튼을 찾지 못했다.`);
}

async function press(root: ReactTestInstance, label: string) {
  await act(async () => {
    findByAccessibilityLabel(root, label).props.onPress();
  });
  await flushQueries();
}

/** 카테고리 탭 전환. 다른 카테고리 아이템은 탭을 옮기기 전까지 목록에 없다. */
async function selectCategory(root: ReactTestInstance, label: string) {
  await act(async () => {
    root
      .find(
        node =>
          node.props.accessibilityRole === 'tab' &&
          node.props.children?.props?.children === label,
      )
      .props.onPress();
  });
}

function requestedPaths() {
  return fetchMock.mock.calls.map(([url]) => url);
}

/** 미리보기가 겹쳐 그린 레이어. 기본 캐릭터가 첫 번째, 아이템이 그 위에 쌓인다. */
function previewLayers(root: ReactTestInstance) {
  return findByAccessibilityLabel(root, '내 캐릭터 미리보기')
    .findAllByType(Image)
    .map(node => node.props.source);
}

function createQueryClient() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return queryClient;
}

async function render(element: React.ReactElement, client: QueryClient) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
            {element}
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function renderMyPage(client: QueryClient) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MyPage" component={MyPageScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
    client,
  );
}

function renderCustomize(client: QueryClient) {
  return render(<CharacterCustomizeScreen />, client);
}

describe('목업 캐릭터 모드', () => {
  test('목업 스위치가 켜져 있다', () => {
    // 꺼진 채로 커밋되면 이 파일의 나머지 테스트가 의미를 잃는다.
    expect(USE_MOCK_CHARACTER).toBe(true);
  });

  test('마이페이지가 번들 에셋으로 기본 캐릭터와 착용 아이템을 겹쳐 그린다', async () => {
    const tree = await renderMyPage(createQueryClient());

    // 카테고리 순서(상의 -> 모자)로 겹쳐 그리므로, 목업에 적어둔 순서와는 다르다.
    expect(previewLayers(tree.root)).toEqual([
      MOCK_CHARACTER.baseImage,
      findMockItem('싸피티').image,
      findMockItem('밀짚모자').image,
    ]);
  });

  test('닉네임은 목업이 아니라 서버 값을 보여준다', async () => {
    const tree = await renderMyPage(createQueryClient());

    expect(findByAccessibilityLabel(tree.root, '닉네임').props.value).toBe(
      SERVER_NICKNAME,
    );
  });

  test('갈아입고 저장하면 아이템 요청 없이 캐릭터 캐시가 갱신된다', async () => {
    const client = createQueryClient();
    const tree = await renderCustomize(client);

    await press(tree.root, `${JUNGLE_HAT.name} 착용하기`);
    await selectCategory(tree.root, '상의');
    await press(tree.root, `${FLEECE.name} 착용하기`);
    await act(async () => {
      findButtonByText(tree.root, '저장하기').props.onPress();
    });
    await flushQueries();

    // 하의는 손대지 않았으므로 처음 착용한 상의/모자만 갈아입은 상태가 남는다.
    expect(previewLayers(tree.root)).toEqual([
      MOCK_CHARACTER.baseImage,
      FLEECE.image,
      JUNGLE_HAT.image,
    ]);
    expect(
      client
        .getQueryData<Character>(CHARACTER_QUERY_KEY)
        ?.equippedItems.map(item => item.name),
    ).toEqual([FLEECE.name, JUNGLE_HAT.name]);
    // 보유 아이템 목록과 장착 저장은 서버로 나가지 않는다. 나가는 요청은
    // 닉네임을 얻기 위한 캐릭터 조회뿐이다.
    expect(
      requestedPaths().filter(url => !url.includes('/members/character')),
    ).toEqual([]);
  });
});

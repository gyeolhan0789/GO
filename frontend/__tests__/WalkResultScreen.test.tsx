/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../src/app/navigation/RootNavigator';
import { WalkResultScreen } from '../src/screens/WalkResultScreen/WalkResultScreen';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type WalkResultParams = RootStackParamList['WalkResult'];

const BASE_PARAMS: WalkResultParams = {
  roomId: 12,
  roomName: '황덕',
  mode: 'SINGLE' as const,
  steps: 3_240,
  distanceKm: 2.4,
  calories: 118,
  elapsedSeconds: 1_680,
  achievedMissionCount: 0,
  earnedPoint: 0,
  targetStepCount: 10_000,
};

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

/**
 * Text 하나가 보여주는 글자를 그대로 잇는다. `+{formatPoints(n)}`처럼 자식이
 * 여럿이면 화면에는 '+50P'로 붙어 나오는데, 자식을 낱개로 모으면 '+'와 '50P'로
 * 갈려서 실제로 보이는 문자열을 검사할 수 없다.
 */
function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map(node => {
      const children = node.props.children;
      return (Array.isArray(children) ? children : [children])
        .filter(
          (child): child is string | number =>
            typeof child === 'string' || typeof child === 'number',
        )
        .join('');
    })
    .filter(text => text.length > 0);
}

function hasLabel(root: ReactTestInstance, label: string): boolean {
  return root.findAll(node => node.props.accessibilityLabel === label).length > 0;
}

async function renderScreen(
  params: Partial<WalkResultParams> = {},
): Promise<ReactTestRenderer.ReactTestRenderer> {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="WalkResult"
              component={WalkResultScreen}
              initialParams={{ ...BASE_PARAMS, ...params }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('WalkResultScreen', () => {
  test('방금 끝낸 산책의 수치를 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('산책 완료!');
    expect(texts).toContain('3,240');
    expect(texts).toContain('2.4');
    expect(texts).toContain('118');
  });

  test('걸음 목표를 채우면 목표 보수와 받은 포인트를 나눠 적는다', async () => {
    const tree = await renderScreen({ earnedPoint: 100 });
    const texts = collectTexts(tree.root);

    expect(texts).toContain('목표 걸음 달성!');
    expect(texts).toContain('10,000 걸음');
    expect(texts).toContain('보상 획득!');
    expect(texts).toContain('+ 100P');
  });

  test('받은 포인트가 없으면 목표·보상 줄을 아예 그리지 않는다', async () => {
    // 0P를 띄우면 못 받은 걸 받은 것처럼 읽힌다. 서버는 목표 미달일 때도,
    // 같은 키로 다시 보내 기존 기록이 돌아왔을 때도 0을 준다.
    const tree = await renderScreen({ earnedPoint: 0 });
    const texts = collectTexts(tree.root);

    expect(texts).not.toContain('목표 걸음 달성!');
    expect(texts).not.toContain('보상 획득!');
  });

  test('목표 걸음을 모르면 보상만 적는다', async () => {
    // 목표 걸음이 없는 방도 있다.
    const tree = await renderScreen({ earnedPoint: 100, targetStepCount: null });
    const texts = collectTexts(tree.root);

    expect(texts).not.toContain('목표 걸음 달성!');
    expect(texts).toContain('보상 획득!');
  });

  test('포인트가 커도 자릿수를 끊어 보여준다', async () => {
    const tree = await renderScreen({ earnedPoint: 1_200 });

    expect(collectTexts(tree.root)).toContain('+ 1,200P');
  });

  test('이번 산책에 깬 미션 수를 보여준다', async () => {
    const tree = await renderScreen({ achievedMissionCount: 3 });
    const texts = collectTexts(tree.root);

    expect(texts).toContain('미션 3개 성공!');
    expect(hasLabel(tree.root, '미션 3개 성공! 이번 산책에서 깬 칸')).toBe(true);
  });

  test('깬 미션이 없으면 그 줄도 그리지 않는다', async () => {
    const tree = await renderScreen({ achievedMissionCount: 0 });

    expect(collectTexts(tree.root)).not.toContain('미션 0개 성공!');
  });

  test('이룬 게 하나도 없으면 목록 자체를 그리지 않는다', async () => {
    const tree = await renderScreen({
      achievedMissionCount: 0,
      earnedPoint: 0,
    });
    const texts = collectTexts(tree.root);

    // 빈 상자가 남으면 뭔가 못 받은 것처럼 보인다.
    expect(texts).not.toContain('보상 획득!');
    expect(texts).not.toContain('미션 0개 성공!');
    expect(texts).toContain('산책 완료!');
  });

  test('목표·미션·보상을 모두 이루면 세 줄이 순서대로 선다', async () => {
    const tree = await renderScreen({
      achievedMissionCount: 2,
      earnedPoint: 100,
    });
    const texts = collectTexts(tree.root);

    expect(texts.indexOf('목표 걸음 달성!')).toBeLessThan(
      texts.indexOf('미션 2개 성공!'),
    );
    expect(texts.indexOf('미션 2개 성공!')).toBeLessThan(
      texts.indexOf('보상 획득!'),
    );
  });
});

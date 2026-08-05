/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactTestInstance } from 'react-test-renderer';

import {
  BattleResultModal,
  type BattleForfeitResult,
} from '../src/features/bingo/components/BattleResultModal/BattleResultModal';

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
const onConfirm = jest.fn();

function render(result: BattleForfeitResult | null) {
  act(() => {
    renderer = ReactTestRenderer.create(
      // BottomSheet가 안전 영역 여백을 읽어서 Provider 없이는 렌더가 죽는다.
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <BattleResultModal result={result} onConfirm={onConfirm} />
      </SafeAreaProvider>,
    );
  });
  return renderer!.root;
}

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter(
      (child): child is string | number =>
        typeof child === 'string' || typeof child === 'number',
    )
    .join(' | ');
}

beforeEach(() => {
  onConfirm.mockClear();
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
});

describe('BattleResultModal', () => {
  test('몰수승은 승리와 보상 300P를 알린다', () => {
    const root = render('WIN_BY_FORFEIT');

    const shown = texts(root);
    expect(shown).toContain('상대가 기권했어요');
    expect(shown).toContain('나의 승리');
    expect(shown).toContain('300');
  });

  test('기권은 상대 승리와 참여 보상 50P를 알린다', () => {
    const root = render('FORFEITED');

    const shown = texts(root);
    expect(shown).toContain('기권했어요');
    expect(shown).toContain('상대의 승리');
    expect(shown).toContain('50');
  });

  test('확인을 누르면 onConfirm이 불린다', () => {
    const root = render('WIN_BY_FORFEIT');

    const [confirm] = root.findAll(
      node =>
        node.props.accessibilityLabel === '확인' &&
        typeof node.props.onPress === 'function',
    );
    act(() => confirm.props.onPress());

    expect(onConfirm).toHaveBeenCalled();
  });

  test('result가 null이면 아무것도 그리지 않는다', () => {
    const root = render(null);

    expect(texts(root)).not.toContain('기권');
  });
});

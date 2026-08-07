/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BingoGuideOverlay } from '../src/screens/WalkSessionScreen/components/BingoGuideOverlay';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 40, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

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

function renderOverlay(visible = true) {
  const onDismiss = jest.fn();

  act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <BingoGuideOverlay visible={visible} onDismiss={onDismiss} />
      </SafeAreaProvider>,
    );
  });
  if (!renderer) {
    throw new Error('renderer가 생성되지 않았습니다.');
  }
  return { root: renderer.root, onDismiss };
}

describe('BingoGuideOverlay', () => {
  it('빙고판 버튼이 어디 있는지 알려준다', () => {
    const { root } = renderOverlay();

    expect(root.findByType(Modal).props.visible).toBe(true);
    expect(collectTexts(root)).toContain('빙고판은 여기 있어요');
  });

  it('확인을 누르면 안내를 닫는다', () => {
    const { root, onDismiss } = renderOverlay();

    act(() => {
      root
        .findByProps({ accessibilityLabel: '빙고판 안내 확인' })
        .props.onPress();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('배경을 눌러도 닫힌다', () => {
    // 읽고 넘기는 안내라 확인 버튼을 찾아 누르게 만들 이유가 없다.
    const { root, onDismiss } = renderOverlay();

    act(() => {
      root.findByProps({ accessibilityLabel: '빙고판 안내 닫기' }).props.onPress();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('안드로이드 뒤로가기도 닫기와 같게 다룬다', () => {
    const { root, onDismiss } = renderOverlay();

    act(() => {
      root.findByType(Modal).props.onRequestClose();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

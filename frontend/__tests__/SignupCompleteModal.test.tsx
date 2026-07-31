/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Pressable, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { SignupCompleteModal } from '../src/screens/SignupScreen/components/SignupCompleteModal';

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

function renderModal(visible: boolean, onConfirm = jest.fn()) {
  act(() => {
    renderer = ReactTestRenderer.create(
      <SignupCompleteModal visible={visible} onConfirm={onConfirm} />,
    );
  });
  if (!renderer) {
    throw new Error('renderer가 생성되지 않았습니다.');
  }
  return { root: renderer.root, onConfirm };
}

describe('SignupCompleteModal', () => {
  it('가입이 끝나면 OS 알림 대신 서비스 모달로 완료를 알린다', () => {
    const { root } = renderModal(true);

    expect(root.findByType(Modal).props.visible).toBe(true);
    const texts = collectTexts(root);
    expect(texts).toContain('회원가입 완료');
    expect(texts).toContain('이제 로그인하고 산책을 시작해보세요!');
  });

  it('확인을 누르면 onConfirm으로 로그인 화면 이동을 알린다', () => {
    const { root, onConfirm } = renderModal(true);

    const action = root.findByProps({ accessibilityLabel: '회원가입 완료 확인' });
    act(() => {
      action.props.onPress();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('안드로이드 뒤로가기도 확인과 같은 곳으로 보낸다', () => {
    const { root, onConfirm } = renderModal(true);

    act(() => {
      root.findByType(Modal).props.onRequestClose();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('visible이 false면 닫힌 상태로 둔다', () => {
    const { root } = renderModal(false);

    expect(root.findByType(Modal).props.visible).toBe(false);
    // 닫혀 있으면 Modal이 자식을 아예 그리지 않아 확인 버튼도 눌릴 수 없다.
    expect(collectTexts(root)).not.toContain('회원가입 완료');
    expect(root.findAllByType(Pressable)).toHaveLength(0);
  });
});

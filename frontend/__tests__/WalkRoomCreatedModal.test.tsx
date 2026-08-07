/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { WalkRoomCreatedModal } from '../src/screens/CompanionScreen/components/WalkRoomCreatedModal';

const ROOM_NAME = '아침 산책 모임';

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

function renderModal(visible = true) {
  const onView = jest.fn();
  const onClose = jest.fn();

  act(() => {
    renderer = ReactTestRenderer.create(
      <WalkRoomCreatedModal
        visible={visible}
        roomName={ROOM_NAME}
        onView={onView}
        onClose={onClose}
      />,
    );
  });
  if (!renderer) {
    throw new Error('renderer가 생성되지 않았습니다.');
  }
  return { root: renderer.root, onView, onClose };
}

describe('WalkRoomCreatedModal', () => {
  it('만든 방 이름과 두 갈래를 보여준다', () => {
    const { root } = renderModal();

    expect(root.findByType(Modal).props.visible).toBe(true);
    const texts = collectTexts(root);
    expect(texts).toContain('산책방이 만들어졌어요!');
    expect(texts).toContain(ROOM_NAME);
    expect(texts).toContain('보러가기');
    expect(texts).toContain('닫기');
  });

  it('보러가기를 누르면 방으로 이동을 알린다', () => {
    const { root, onView, onClose } = renderModal();

    act(() => {
      root.findByProps({ accessibilityLabel: '보러가기' }).props.onPress();
    });

    expect(onView).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('닫기를 누르면 목록으로 돌아감을 알린다', () => {
    const { root, onView, onClose } = renderModal();

    act(() => {
      root.findByProps({ accessibilityLabel: '닫기' }).props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onView).not.toHaveBeenCalled();
  });

  it('안드로이드 뒤로가기는 닫기와 같게 다룬다', () => {
    // 방은 이미 만들어졌으니 뒤로가기로 사라질 게 없다. 목록으로 돌아가면 된다.
    const { root, onClose } = renderModal();

    act(() => {
      root.findByType(Modal).props.onRequestClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

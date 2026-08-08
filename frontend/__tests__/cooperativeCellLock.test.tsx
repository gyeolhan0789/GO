/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  BingoBoard,
  type BingoBoardCell,
} from '../src/features/bingo/components/BingoBoard/BingoBoard';

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function buildCell(overrides: Partial<BingoBoardCell> = {}): BingoBoardCell {
  return { id: '1', completed: false, ...overrides };
}

function render(
  cells: BingoBoardCell[],
  onCellPress?: () => void,
  width?: number,
) {
  act(() => {
    renderer = ReactTestRenderer.create(
      <BingoBoard
        size={3}
        cells={cells}
        width={width}
        onCellPress={onCellPress}
      />,
    );
  });
  return renderer!.root;
}

/** 칸을 감싼 Pressable들. 그리드가 칸마다 하나씩 만든다. */
function pressables() {
  return renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      typeof node.props.disabled === 'boolean',
  );
}

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
});

describe('협동 빙고판 — 팀원이 인증 중인 칸', () => {
  test('실측 폭을 받으면 첫 렌더부터 정상 크기의 칸을 그린다', () => {
    render(
      [buildCell(), buildCell({ id: '2' }), buildCell({ id: '3' })],
      undefined,
      320,
    );

    expect(pressables().map(node => node.props.style)).toEqual([
      { width: 104, height: 104 },
      { width: 104, height: 104 },
      { width: 104, height: 104 },
    ]);
  });

  test('검증을 기다리는 칸은 눌리지 않는다', () => {
    render([buildCell({ pending: true })], () => {});

    expect(pressables()[0].props.disabled).toBe(true);
  });

  test('평범한 칸은 눌린다', () => {
    const onCellPress = jest.fn();
    render([buildCell()], onCellPress);

    expect(pressables()[0].props.disabled).toBe(false);
    act(() => {
      pressables()[0].props.onPress();
    });
    expect(onCellPress).toHaveBeenCalled();
  });

  test('검증 중인 칸만 막고 나머지는 그대로 둔다', () => {
    render(
      [
        buildCell({ id: '1', pending: true }),
        buildCell({ id: '2' }),
        buildCell({ id: '3', pending: true }),
      ],
      () => {},
    );

    expect(pressables().map(node => node.props.disabled)).toEqual([
      true,
      false,
      true,
    ]);
  });

  test('onCellPress가 없으면 표시용이라 전부 막힌다', () => {
    render([buildCell(), buildCell({ id: '2', pending: true })]);

    expect(pressables().map(node => node.props.disabled)).toEqual([true, true]);
  });

  test('완료된 칸에는 검증 중 표시를 겹치지 않는다', () => {
    // 완료는 색이 차서 확정을 뜻한다. 점선까지 겹치면 상태가 두 개로 읽힌다.
    render([buildCell({ completed: true, pending: true })], () => {});

    const styles = renderer!.root
      .findAll(node => Array.isArray(node.props.style))
      .flatMap(node => node.props.style)
      .filter((style): style is Record<string, unknown> => style !== null);

    expect(
      styles.some(style => style.borderStyle === 'dashed'),
    ).toBe(false);
  });
});

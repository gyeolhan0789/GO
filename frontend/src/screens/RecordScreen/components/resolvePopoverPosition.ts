import { spacing } from '../../../shared/constants/spacing';

/** 화면 가장자리에 붙지 않게 남기는 최소 여백. */
const SCREEN_MARGIN = spacing.md;

/** 카드와 막대 사이 틈. 카드가 막대에 얹혀 보이지 않게 띄운다. */
export const ANCHOR_GAP = spacing.xs;

/**
 * 위에 놓을 자리가 되는지 가늠할 카드 높이. 카드가 제목 한 줄 + 수치 한 줄로
 * 고정이라 실제로 재지 않고 이 값으로 판단한다. 재고 나서 옮기면 카드가 한 번
 * 튀어 보인다.
 */
const ESTIMATED_HEIGHT = 96;

/** 차트에서 누른 막대의 화면 기준 자리. */
export type SegmentAnchor = {
  /** 막대의 가로 중심. 카드를 이 자리에 맞춘다. */
  centerX: number;
  /** 탭 영역 위 끝. 카드는 기본적으로 이 위에 올라간다. */
  top: number;
  /** 탭 영역 아래 끝. 위쪽 자리가 모자랄 때만 쓴다. */
  bottom: number;
};

type PopoverLayout = {
  anchor: SegmentAnchor;
  popoverWidth: number;
  screenWidth: number;
  screenHeight: number;
};

export type PopoverPosition = {
  left: number;
  /** 카드가 막대 위에 있는지. offset을 어느 변에서 재는지가 여기서 갈린다. */
  isAbove: boolean;
  /**
   * isAbove면 화면 아래에서 카드 밑변까지의 거리(bottom), 아니면 화면 위에서
   * 카드 윗변까지의 거리(top). 어느 쪽이든 카드 높이를 몰라도 놓을 수 있다.
   */
  offset: number;
};

/**
 * 누른 막대 위에 그 막대를 가로 중심으로 두고 카드를 얹는다. 차트 양 끝 막대는
 * 그 계산이 화면을 넘기므로 가장자리 안으로 밀어 넣는다.
 */
export function resolvePopoverPosition({
  anchor,
  popoverWidth,
  screenWidth,
  screenHeight,
}: PopoverLayout): PopoverPosition {
  const centered = anchor.centerX - popoverWidth / 2;
  // 카드가 화면보다 넓으면 오른쪽 한계가 더 작아지므로 왼쪽에 붙인다.
  const maxLeft = Math.max(
    screenWidth - popoverWidth - SCREEN_MARGIN,
    SCREEN_MARGIN,
  );

  // 차트가 화면 위쪽에 붙어 있으면 위로 올릴 자리가 없다.
  const isAbove = anchor.top - ANCHOR_GAP - SCREEN_MARGIN >= ESTIMATED_HEIGHT;

  return {
    left: Math.min(Math.max(centered, SCREEN_MARGIN), maxLeft),
    isAbove,
    offset: isAbove
      ? screenHeight - anchor.top + ANCHOR_GAP
      : anchor.bottom + ANCHOR_GAP,
  };
}

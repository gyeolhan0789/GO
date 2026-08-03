export type RevealMeasurement = {
  /** 스크롤 뷰의 현재 스크롤 위치. */
  offsetY: number;
  /** 보이는 영역의 위 끝. 창 좌표. */
  visibleTop: number;
  /** 키보드 윗변까지 감안한 보이는 영역의 아래 끝. 창 좌표. */
  visibleBottom: number;
  /** 입력창의 위 끝. 창 좌표. */
  fieldTop: number;
  fieldHeight: number;
  /** 입력창 위아래로 남길 여백. 라벨과 오류 문구가 함께 보일 만큼 둔다. */
  margin: number;
};

/**
 * 입력창이 보이는 영역 안에 들어오게 하는 새 스크롤 위치.
 * 이미 여백까지 다 보이면 null을 줘서 화면이 흔들리지 않게 한다.
 */
export function resolveRevealOffset({
  offsetY,
  visibleTop,
  visibleBottom,
  fieldTop,
  fieldHeight,
  margin,
}: RevealMeasurement): number | null {
  const fieldBottom = fieldTop + fieldHeight;

  // 아래로 가려진 경우를 먼저 본다. 키보드가 올라와 생기는 상황이 이쪽이다.
  if (fieldBottom + margin > visibleBottom) {
    return Math.max(0, offsetY + fieldBottom + margin - visibleBottom);
  }

  if (fieldTop - margin < visibleTop) {
    return Math.max(0, offsetY + fieldTop - margin - visibleTop);
  }

  return null;
}

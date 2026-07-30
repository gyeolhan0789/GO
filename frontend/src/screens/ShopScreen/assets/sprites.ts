// 상점 포인트 아이콘용 픽셀 스프라이트.
// rows의 각 문자가 palette의 색 키이며, '.'은 투명 픽셀이다.
// (PixelSprite가 문자 하나를 정사각형 1칸으로 그린다.)

export type PixelSpriteData = {
  palette: Record<string, string>;
  rows: string[];
};

export const sprites = {
  coin: {
    palette: { y: '#E0A82E', o: '#FFD24A', l: '#FFF0B3' },
    rows: [
      '..yyyy..',
      '.yooooy.',
      'yooloooy',
      'yolooooy',
      'yolooooy',
      'yooloooy',
      '.yooooy.',
      '..yyyy..',
    ],
  },
} satisfies Record<string, PixelSpriteData>;

// 상점 아이템/포인트 아이콘용 픽셀 스프라이트.
// rows의 각 문자가 palette의 색 키이며, '.'은 투명 픽셀이다.
// (PixelSprite가 문자 하나를 정사각형 1칸으로 그린다.)

export type PixelSpriteData = {
  palette: Record<string, string>;
  rows: string[];
};

// 상의 3종이 같은 실루엣을 공유한다. 색만 바꿔 다른 옷으로 쓴다.
const SHIRT_ROWS = [
  '............',
  '...dd..dd...',
  '..dggddggd..',
  '.dggggggggd.',
  'dggggggggggd',
  'dggdggggdggd',
  '.dddggggddd.',
  '...dggggd...',
  '...dggggd...',
  '...dggggd...',
  '...dddddd...',
  '............',
];

const STRIPED_SHIRT_ROWS = [
  '............',
  '...dd..dd...',
  '..dggddggd..',
  '.dwwwwwwwwd.',
  'dggggggggggd',
  'dwwdwwwwdwwd',
  '.dddggggddd.',
  '...dwwwwd...',
  '...dggggd...',
  '...dwwwwd...',
  '...dddddd...',
  '............',
];

// 하의 3종 중 긴 바지 2종이 공유하는 실루엣.
const PANTS_ROWS = [
  '............',
  '..dddddddd..',
  '.dbbbbbbbbd.',
  '.dbbbbbbbbd.',
  '.dbbbbbbbbd.',
  '.dbbbddbbbd.',
  '.dbbd..dbbd.',
  '.dbbd..dbbd.',
  '.dbbd..dbbd.',
  '.dbbd..dbbd.',
  '.dddd..dddd.',
  '............',
];

const SHORTS_ROWS = [
  '............',
  '............',
  '..dddddddd..',
  '.dbbbbbbbbd.',
  '.dbbbbbbbbd.',
  '.dbbbddbbbd.',
  '.dbbd..dbbd.',
  '.dbbd..dbbd.',
  '.dddd..dddd.',
  '............',
  '............',
  '............',
];

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
  ribbonPin: {
    palette: { d: '#D45C7E', p: '#F28BA8', w: '#FFD9E3' },
    rows: [
      '............',
      '..dd....dd..',
      '.dppd..dppd.',
      '.dpwpddpwpd.',
      '.dppdwwdppd.',
      '..dd.ww.dd..',
      '.....dd.....',
      '....d..d....',
      '....d..d....',
      '...d....d...',
      '...d....d...',
      '............',
    ],
  },
  flowerPin: {
    palette: { d: '#D4739A', p: '#F2A0BE', y: '#FFD35C', g: '#7FB96A' },
    rows: [
      '............',
      '...dd..dd...',
      '..dppddppd..',
      '..dpyyyypd..',
      '...dyyyyd...',
      '..dpyyyypd..',
      '..dppddppd..',
      '...dd..dd...',
      '.....gg.....',
      '....g.g.....',
      '.....gg.....',
      '............',
    ],
  },
  prettyPin: {
    palette: { d: '#E58FB0', p: '#FBC7D8', w: '#FFF0F5', g: '#8FBF6A' },
    rows: [
      '............',
      '...d....d...',
      '..dpd..dpd..',
      '..dppddppd..',
      '...dpwwpd...',
      '....dwwd....',
      '.....gg.....',
      '....g.g.....',
      '...g...g....',
      '............',
      '............',
      '............',
    ],
  },
  strawHat: {
    palette: { d: '#B98A3C', y: '#F0C86A', l: '#FBE3A6', r: '#E8748C' },
    rows: [
      '............',
      '....dddd....',
      '...dyyyyd...',
      '...dylyyd...',
      '..dyyyyyyd..',
      '..drrrrrrd..',
      '.dyyyyyyyyd.',
      'dyylyyyyyyyd',
      'dddddddddddd',
      '............',
      '............',
      '............',
    ],
  },
  greenHoodie: {
    palette: { d: '#3F6B2C', g: '#6FA84F' },
    rows: SHIRT_ROWS,
  },
  creamKnit: {
    palette: { d: '#B99A5E', g: '#F2E2B6' },
    rows: SHIRT_ROWS,
  },
  stripedTee: {
    palette: { d: '#2F5C8A', g: '#4E86C4', w: '#F4F7FB' },
    rows: STRIPED_SHIRT_ROWS,
  },
  denimPants: {
    palette: { d: '#2C4C74', b: '#4A76A8' },
    rows: PANTS_ROWS,
  },
  khakiPants: {
    palette: { d: '#7A6A3C', b: '#BCA96A' },
    rows: PANTS_ROWS,
  },
  greenShorts: {
    palette: { d: '#3F6B2C', b: '#7FB96A' },
    rows: SHORTS_ROWS,
  },
} satisfies Record<string, PixelSpriteData>;

export type SpriteName = keyof typeof sprites;

import { StyleSheet } from 'react-native';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

// 캐릭터를 세워둘 산책길 배경. 사진이 아니라 도형이라 어떤 크기로 늘려도
// 흐려지지 않고, 캐릭터/아이템 이미지만 서버에서 받아 위에 얹으면 된다.
const SCENE_WIDTH = 320;
const SCENE_HEIGHT = 180;

const SKY_TOP = '#F6FBF2';
const SKY_BOTTOM = '#E4F3DC';
const HILL_FAR = '#CDE8C0';
const HILL_NEAR = '#BCDFAB';
const GROUND = '#C7E6B6';
const TRAIL = '#EEF7E8';
const SUN = '#FCEFB4';
const LEAF = '#A8D69A';
const TRUNK = '#A9825C';
const TREE_DARK = '#7FC46E';
const TREE_LIGHT = '#9BD68C';

type TreeProps = {
  x: number;
  y: number;
  scale: number;
};

function Tree({ x, y, scale }: TreeProps) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect x={-3} y={2} width={6} height={20} rx={2} fill={TRUNK} />
      <Circle cx={-9} cy={-2} r={11} fill={TREE_DARK} />
      <Circle cx={9} cy={-2} r={11} fill={TREE_DARK} />
      <Circle cx={0} cy={-12} r={13} fill={TREE_LIGHT} />
    </G>
  );
}

export function CharacterScene() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      // 카드 비율이 배경 비율과 달라도 여백 없이 꽉 채운다.
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SKY_TOP} />
          <Stop offset="1" stopColor={SKY_BOTTOM} />
        </LinearGradient>
      </Defs>

      <Rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#sky)" />

      <Circle cx={272} cy={34} r={30} fill={SUN} opacity={0.35} />
      <Circle cx={272} cy={34} r={17} fill={SUN} opacity={0.85} />

      <Ellipse cx={70} cy={112} rx={120} ry={44} fill={HILL_FAR} />
      <Ellipse cx={262} cy={116} rx={110} ry={40} fill={HILL_FAR} />
      <Ellipse cx={160} cy={140} rx={210} ry={52} fill={HILL_NEAR} />
      <Rect y={150} width={SCENE_WIDTH} height={30} fill={GROUND} />

      {/* 발밑에서 뒤로 멀어지는 산책길. */}
      <Path
        d={`M136 ${SCENE_HEIGHT} L152 118 L172 118 L200 ${SCENE_HEIGHT} Z`}
        fill={TRAIL}
      />

      <Tree x={34} y={126} scale={1} />
      <Tree x={68} y={132} scale={0.8} />
      <Tree x={284} y={126} scale={1} />
      <Tree x={252} y={134} scale={0.75} />

      {/* 바닥에 흩뿌린 풀. 가운데는 캐릭터가 서는 자리라 비워둔다. */}
      <G fill={LEAF} opacity={0.9}>
        <Ellipse cx={106} cy={158} rx={4} ry={6} />
        <Ellipse cx={122} cy={168} rx={3} ry={5} />
        <Ellipse cx={214} cy={160} rx={4} ry={6} />
        <Ellipse cx={232} cy={170} rx={3} ry={5} />
        <Ellipse cx={60} cy={170} rx={3} ry={5} />
        <Ellipse cx={272} cy={166} rx={3} ry={5} />
      </G>
    </Svg>
  );
}

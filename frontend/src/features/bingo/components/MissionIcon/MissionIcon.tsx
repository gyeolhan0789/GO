import type { ReactNode } from 'react';
import { SvgXml } from 'react-native-svg';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../../shared/constants/colors';
import { missionCellIconSize, resolveMissionIconSource } from '../../model/missionIcon';
import { MISSION_TYPE_ICONS } from '../../model/missionType';
import type { MissionType } from '../../model/missionType';

type MissionIconProps = {
  type: MissionType;
  decisionCondition: string;
  size: number;
  /** 로컬 아이콘을 못 찾아 Ionicons로 넘어갈 때만 쓰는 색. */
  color: string;
};

/**
 * 미션을 표시하는 모든 곳(목록/카드/상세/인증 결과)이 공유하는 아이콘.
 * mission.imageUrl(서버 업로드 이미지)은 쓰지 않고, decisionCondition과
 * mission.type으로 로컬 아이콘을 우선 고른다 — 대응 SVG가 없을 때만 기존
 * Ionicons 타입 기본 아이콘으로 넘어간다.
 *
 * 아이콘은 20x20 정사각 격자에 shape-rendering="crispEdges"가 박힌 픽셀 아트
 * SVG라, PNG와 달리 크기를 키워도 흐려지지 않는다(별도 pixelated 설정 불필요).
 */
export function MissionIcon({ type, decisionCondition, size, color }: MissionIconProps) {
  // BingoBoard 셀은 레이아웃이 잡히기 전 첫 프레임엔 cellSize(=size)가 0으로
  // 내려온다. SvgXml/Image는 0 크기여도 죽지 않지만 Ionicons는 내부적으로
  // Text라, fontSize 0으로 그리면 "FontSize should be a positive value"로
  // 네이티브가 죽는다 — 실측 전에는 아무것도 안 그리고 다음 프레임을 기다린다.
  if (size <= 0) {
    return null;
  }

  const xml = resolveMissionIconSource(type, decisionCondition);

  if (xml) {
    return (
      <SvgXml
        xml={xml}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  return <Ionicons name={MISSION_TYPE_ICONS[type]} size={size} color={color} />;
}

/**
 * BingoBoard 셀(BingoBoardCell.icon)에 넘기는 render-prop을 만든다. 셀 크기는
 * 보드 폭/칸 수에 따라 달라지므로, 렌더 시점에 실제 cellSize를 받아 그에 맞는
 * 아이콘 크기로 그린다 — 화면 컴포넌트 안에서 매번 인라인 함수를 새로 정의하지
 * 않도록(react/no-unstable-nested-components) 여기 한 곳에 모아둔다.
 */
export function renderMissionCellIcon(
  type: MissionType,
  decisionCondition: string,
  completed: boolean,
): (cellSize: number) => ReactNode {
  return cellSize => (
    <MissionIcon
      type={type}
      decisionCondition={decisionCondition}
      size={missionCellIconSize(cellSize)}
      color={completed ? colors.surface : colors.ink}
    />
  );
}

import { MISSION_ICON_SOURCES } from './missionIconSources';
import type { MissionType } from './missionType';

// 백엔드가 mission.imageUrl로 업로드 이미지를 내려줘도, 로컬 아이콘
// (MISSION_ICON_SOURCES)을 항상 우선 표시한다 — 서버 이미지는 참조하지 않는다.

type RelationTarget = {
  subject?: unknown;
};

type ParsedDecisionCondition = {
  metric?: unknown;
  target?: unknown;
};

function parseDecisionCondition(decisionCondition: string): ParsedDecisionCondition {
  try {
    const parsed = JSON.parse(decisionCondition) as unknown;
    return parsed !== null && typeof parsed === 'object' ? (parsed as ParsedDecisionCondition) : {};
  } catch {
    return {};
  }
}

// decisionCondition.metric 값(snake_case) → 아이콘 키. 실제 DB 미션풀 기준으로
// 발자국/시간/거리/칼로리/속도 다섯 묶음으로 합쳤다 — 연속/일일 여부는 미션
// 제목에 이미 나오니 아이콘까지 따로 나눌 필요가 없다(2026-08-07 재설계).
const METRIC_ICON_KEY: Record<string, string> = {
  steps: 'metric-steps',
  continuous_steps: 'metric-steps',
  daily_steps: 'metric-steps',
  walking_time: 'metric-walking-time',
  continuous_walking_time: 'metric-walking-time',
  distance: 'metric-distance',
  calories: 'metric-calories',
  average_speed: 'metric-average-speed',
};

// OBJECT/ATTRIBUTE/RELATION 타입 기본 아이콘. 지금 아이콘 세트엔 없지만(45개
// 전부 타겟/메트릭 전용), 나중에 타겟 커버리지 밖의 미션이 추가될 때를 대비한
// 안전망으로 키만 남겨둔다 — 파일이 없으면 MISSION_TYPE_ICONS(Ionicons)로 넘어간다.
const TYPE_DEFAULT_ICON_KEY: Partial<Record<MissionType, string>> = {
  OBJECT: 'type-object',
  ATTRIBUTE: 'type-attribute',
  RELATION: 'type-relation',
};

function toIconKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim().toLowerCase().replace(/_/g, '-')
    : null;
}

function findIconKey(candidate: unknown): string | null {
  const key = toIconKey(candidate);
  return key !== null && key in MISSION_ICON_SOURCES ? key : null;
}

/**
 * decisionCondition과 mission.type으로 로컬 아이콘 키를 고른다:
 * 1. metric이 있으면 metric 전용 아이콘(다섯 묶음).
 * 2. target이 문자열이면(OBJECT/ATTRIBUTE) target 전용 아이콘. constraints는
 *    판정 조건일 뿐 대상 자체를 바꾸지 않아 무시한다 — 빨간 꽃도 흰 꽃도
 *    "꽃"을 찍는 거라 아이콘은 같다.
 * 3. target이 객체면(RELATION) subject만 쓴다. object는 배경 조건이라 보지
 *    않는다 — "나무 옆 벤치" 미션에서 실제로 찍어야 하는 건 벤치다.
 * 4. 위에서 못 찾으면 타입 기본 아이콘(있으면). 그마저 없으면 null — 호출부는
 *    MISSION_TYPE_ICONS(Ionicons)로 넘어간다.
 */
export function resolveMissionIconKey(
  type: MissionType,
  decisionCondition: string,
): string | null {
  const condition = parseDecisionCondition(decisionCondition);

  const metricKey = typeof condition.metric === 'string' ? METRIC_ICON_KEY[condition.metric] : undefined;
  if (metricKey && metricKey in MISSION_ICON_SOURCES) {
    return metricKey;
  }

  const { target } = condition;
  if (typeof target === 'string') {
    const key = findIconKey(target);
    if (key) {
      return key;
    }
  } else if (target !== null && typeof target === 'object') {
    const key = findIconKey((target as RelationTarget).subject);
    if (key) {
      return key;
    }
  }

  return findIconKey(TYPE_DEFAULT_ICON_KEY[type]);
}

/** 로컬 아이콘을 못 고르면(위 규칙 다 실패) null — SVG XML 문자열을 돌려준다. */
export function resolveMissionIconSource(
  type: MissionType,
  decisionCondition: string,
): string | null {
  const key = resolveMissionIconKey(type, decisionCondition);
  return key ? MISSION_ICON_SOURCES[key] : null;
}

// 빙고 셀 크기 대비 아이콘 비율. 칸 테두리에 닿아 잘리지 않을 정도로 여백을
// 남기면서, 판이 커져(칸이 커져) 고정 픽셀 아이콘이 상대적으로 작아 보이던
// 문제를 없앤다 — 칸 크기(BingoBoard의 cellSize)에 비례해 같이 커진다.
const CELL_ICON_RATIO = 0.62;

/** 빙고 셀 안에서 쓸 아이콘 픽셀 크기. cellSize(칸 한 변의 픽셀 길이)에 비례한다. */
export function missionCellIconSize(cellSize: number): number {
  return Math.round(cellSize * CELL_ICON_RATIO);
}

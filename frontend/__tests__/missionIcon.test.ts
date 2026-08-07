/**
 * @format
 */

import { resolveMissionIconKey } from '../src/features/bingo/model/missionIcon';
import { MISSION_ICON_SOURCES } from '../src/features/bingo/model/missionIconSources';

describe('resolveMissionIconKey', () => {
  test('아이콘 45개(타겟 40 + 메트릭 5)가 전부 asset map에 포함된다', () => {
    expect(Object.keys(MISSION_ICON_SOURCES)).toHaveLength(45);
  });

  test('metric은 다섯 묶음으로 합쳐진다(steps/continuous_steps/daily_steps → metric-steps)', () => {
    expect(
      resolveMissionIconKey(
        'STEP_TOTAL',
        JSON.stringify({ metric: 'steps', operator: '>=', value: 300, unit: 'step' }),
      ),
    ).toBe('metric-steps');
    expect(
      resolveMissionIconKey(
        'STEP_CONTINUOUS',
        JSON.stringify({ metric: 'continuous_steps', operator: '>=', value: 500, unit: 'step' }),
      ),
    ).toBe('metric-steps');
    expect(
      resolveMissionIconKey(
        'STEP_DAILY',
        JSON.stringify({ metric: 'daily_steps', operator: '>=', value: 5000, unit: 'step' }),
      ),
    ).toBe('metric-steps');
  });

  test('walking_time과 continuous_walking_time도 하나로 합쳐진다', () => {
    expect(
      resolveMissionIconKey(
        'WALKING_TIME_TOTAL',
        JSON.stringify({ metric: 'walking_time', operator: '>=', value: 5, unit: 'minute' }),
      ),
    ).toBe('metric-walking-time');
    expect(
      resolveMissionIconKey(
        'WALKING_TIME_CONTINUOUS',
        JSON.stringify({ metric: 'continuous_walking_time', operator: '>=', value: 10, unit: 'minute' }),
      ),
    ).toBe('metric-walking-time');
  });

  test('distance/calories/average_speed는 각자 전용 아이콘을 쓴다', () => {
    expect(
      resolveMissionIconKey('DISTANCE_TOTAL', JSON.stringify({ metric: 'distance', value: 300 })),
    ).toBe('metric-distance');
    expect(
      resolveMissionIconKey('CALORIES_TOTAL', JSON.stringify({ metric: 'calories', value: 30 })),
    ).toBe('metric-calories');
    expect(
      resolveMissionIconKey('AVERAGE_SPEED', JSON.stringify({ metric: 'average_speed', value: 4 })),
    ).toBe('metric-average-speed');
  });

  test('OBJECT/ATTRIBUTE: target 문자열을 그대로 쓰고 constraints는 무시한다', () => {
    expect(resolveMissionIconKey('OBJECT', JSON.stringify({ target: 'flower' }))).toBe('flower');
    expect(
      resolveMissionIconKey(
        'ATTRIBUTE',
        JSON.stringify({ target: 'flower', constraints: { color: 'red' } }),
      ),
    ).toBe('flower');
    expect(
      resolveMissionIconKey(
        'ATTRIBUTE',
        JSON.stringify({ target: 'car', constraints: { color: 'white' } }),
      ),
    ).toBe('car');
  });

  test('snake_case target은 kebab-case 파일명으로 변환된다', () => {
    expect(resolveMissionIconKey('OBJECT', JSON.stringify({ target: 'bicycle_rack' }))).toBe(
      'bicycle-rack',
    );
    expect(resolveMissionIconKey('OBJECT', JSON.stringify({ target: 'manhole_cover' }))).toBe(
      'manhole-cover',
    );
  });

  test('RELATION: subject만 쓰고 object는 무시한다(배경 조건)', () => {
    // "나무 옆 벤치 찾기": 실제로 찍어야 하는 건 벤치.
    expect(
      resolveMissionIconKey(
        'RELATION',
        JSON.stringify({
          target: { subject: 'bench', object: 'tree' },
          constraints: { relation: 'next_to' },
        }),
      ),
    ).toBe('bench');
  });

  test('RELATION: object 전용 키워드(fence 등)는 아이콘이 없어도 subject만으로 정상 동작한다', () => {
    // "울타리 안 화단 찾기": object가 fence라도 subject(flower_bed)만 본다.
    expect(
      resolveMissionIconKey(
        'RELATION',
        JSON.stringify({
          target: { subject: 'flower_bed', object: 'fence' },
          constraints: { relation: 'inside' },
        }),
      ),
    ).toBe('flower-bed');
  });

  test('전용 아이콘을 찾지 못하면 타입 기본 아이콘 키를 시도하고, 그마저 없으면 null(→ Ionicons 폴백)', () => {
    // 지금 아이콘 세트엔 type-object.svg가 없어서 null까지 떨어진다.
    expect(resolveMissionIconKey('OBJECT', JSON.stringify({ target: '없는_사물' }))).toBeNull();
    expect(resolveMissionIconKey('RELATION', JSON.stringify({ target: {} }))).toBeNull();
  });

  test('STEADY_PACE처럼 타입 기본값도 없는 타입은 metric/target이 없으면 null', () => {
    expect(resolveMissionIconKey('STEADY_PACE', JSON.stringify({}))).toBeNull();
  });

  test('decisionCondition이 잘못된 JSON이어도 예외 없이 null로 안전하게 떨어진다', () => {
    expect(resolveMissionIconKey('OBJECT', 'not json')).toBeNull();
  });
});

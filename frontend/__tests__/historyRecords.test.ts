/**
 * @format
 */

import {
  formatDuration,
  formatThousands,
  formatWalkDateTime,
} from '../src/features/history/model/format';
import {
  maxValue,
  resolveChartCeiling,
} from '../src/features/history/model/chartScale';
import {
  buildChartSegments,
  selectWalksInSegment,
} from '../src/features/history/model/chartSegments';
import {
  buildHourlyChartData,
  buildStepChartData,
} from '../src/features/history/model/histories';
import {
  eachDateInRange,
  formatPeriodLabel,
  isCurrentPeriod,
  parseIsoDate,
  resolvePeriodRange,
  shiftPeriod,
  toIsoDate,
} from '../src/features/history/model/period';
import {
  buildHistoryResponse,
  buildHourlySteps,
} from '../src/features/history/model/samsungHealthHistory';
import {
  buildMockRecentWalks,
  buildMockWalkPage,
} from '../src/features/history/mocks';
import {
  formatDateRangeLabel,
  resolveDateRange,
  selectWalks,
} from '../src/features/history/model/walkList';
import {
  BAR_SLOT_RATIO,
  resolveBarPercentage,
} from '../src/screens/RecordScreen/chartConfig';

describe('resolvePeriodRange', () => {
  test('주는 월요일에 시작해 일요일에 끝난다', () => {
    // 2026-07-20은 월요일.
    expect(resolvePeriodRange('WEEK', '2026-07-20')).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });
  });

  test('일요일은 그 주 월요일에 시작한 구간에 속한다', () => {
    // getDay()가 일요일을 0으로 주기 때문에 가장 틀리기 쉬운 경계.
    expect(resolvePeriodRange('WEEK', '2026-07-26')).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });
  });

  test('주가 달을 넘어가도 7일을 유지한다', () => {
    expect(resolvePeriodRange('WEEK', '2026-07-28')).toEqual({
      startDate: '2026-07-27',
      endDate: '2026-08-02',
    });
  });

  test('월은 1일부터 말일까지다', () => {
    expect(resolvePeriodRange('MONTH', '2026-02-15')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });

  test('윤년 2월은 29일까지다', () => {
    expect(resolvePeriodRange('MONTH', '2024-02-15')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });

  test('일은 그 하루가 시작이자 끝이다', () => {
    expect(resolvePeriodRange('DAY', '2026-07-28')).toEqual({
      startDate: '2026-07-28',
      endDate: '2026-07-28',
    });
  });
});

describe('shiftPeriod', () => {
  test('말일에서 달을 넘겨도 없는 날짜로 새지 않는다', () => {
    // 1월 31일에서 달만 +1 하면 2월 31일 = 3월 3일이 되어 2월을 건너뛴다.
    expect(shiftPeriod('MONTH', '2026-01-31', 1)).toBe('2026-02-01');
  });

  test('월을 거꾸로 옮긴다', () => {
    expect(shiftPeriod('MONTH', '2026-03-15', -1)).toBe('2026-02-01');
  });

  test('일은 해를 넘겨서도 하루씩 움직인다', () => {
    expect(shiftPeriod('DAY', '2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftPeriod('DAY', '2027-01-01', -1)).toBe('2026-12-31');
  });

  test('주는 7일씩 움직인다', () => {
    expect(shiftPeriod('WEEK', '2026-07-20', -1)).toBe('2026-07-13');
    expect(shiftPeriod('WEEK', '2026-07-20', 1)).toBe('2026-07-27');
  });
});

describe('isCurrentPeriod', () => {
  test('오늘이 든 구간이면 참이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-28', '2026-07-28')).toBe(true);
  });

  test('지난 구간이면 거짓이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-20', '2026-07-28')).toBe(false);
  });

  test('오늘이 구간의 마지막 날이어도 참이다', () => {
    expect(isCurrentPeriod('WEEK', '2026-07-20', '2026-07-26')).toBe(true);
  });
});

describe('날짜 변환', () => {
  test('로컬 자정으로 파싱해서 하루가 밀리지 않는다', () => {
    // new Date('2026-07-20')은 UTC 자정이라 KST에서 7/20 09:00이 되고,
    // 시간대가 UTC보다 뒤인 곳에서는 7/19로 밀린다.
    expect(toIsoDate(parseIsoDate('2026-07-20'))).toBe('2026-07-20');
  });

  test('한 자리 월/일에 0을 채운다', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('eachDateInRange', () => {
  test('주 구간의 7일을 빠짐없이 만든다', () => {
    const dates = eachDateInRange({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });

    expect(dates).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });

  test('달을 넘는 구간도 이어서 만든다', () => {
    expect(
      eachDateInRange({ startDate: '2026-07-31', endDate: '2026-08-02' }),
    ).toEqual(['2026-07-31', '2026-08-01', '2026-08-02']);
  });
});

describe('formatPeriodLabel', () => {
  test('일은 날짜와 요일을 보여준다', () => {
    expect(
      formatPeriodLabel('DAY', {
        startDate: '2026-07-28',
        endDate: '2026-07-28',
      }),
    ).toBe('7.28 (화)');
  });

  test('주는 시작일과 끝일을 이어 보여준다', () => {
    expect(
      formatPeriodLabel('WEEK', {
        startDate: '2026-07-20',
        endDate: '2026-07-26',
      }),
    ).toBe('7.20 (월) - 7.26 (일)');
  });

  test('월은 연도와 월을 보여준다', () => {
    expect(
      formatPeriodLabel('MONTH', {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    ).toBe('2026.07');
  });
});

describe('buildStepChartData', () => {
  const weekHistories = [
    { historyDate: '2026-07-20', step: 1_000, distance: 700, calories: 40 },
    { historyDate: '2026-07-21', step: 2_000, distance: 1_400, calories: 80 },
  ];

  test('주는 하루에 막대 하나를 요일 라벨로 만든다', () => {
    expect(buildStepChartData('WEEK', weekHistories, '2026-07-21')).toEqual([
      { label: '월', value: 1_000, highlighted: false },
      { label: '화', value: 2_000, highlighted: true },
    ]);
  });

  test('월은 7일씩 묶어 주 단위 막대로 줄인다', () => {
    const monthHistories = [
      { historyDate: '2026-07-01', step: 100, distance: 0, calories: 0 },
      { historyDate: '2026-07-07', step: 200, distance: 0, calories: 0 },
      { historyDate: '2026-07-08', step: 300, distance: 0, calories: 0 },
      { historyDate: '2026-07-31', step: 400, distance: 0, calories: 0 },
    ];

    // 기록이 없는 3~4주도 0으로 채워야 x축이 끊기지 않는다.
    expect(buildStepChartData('MONTH', monthHistories, '2026-07-08')).toEqual([
      { label: '1주', value: 300, highlighted: false },
      { label: '2주', value: 300, highlighted: true },
      { label: '3주', value: 0, highlighted: false },
      { label: '4주', value: 0, highlighted: false },
      { label: '5주', value: 400, highlighted: false },
    ]);
  });

  test('하루치는 추이가 되지 않아 막대를 만들지 않는다', () => {
    expect(buildStepChartData('DAY', weekHistories, '2026-07-20')).toEqual([]);
  });
});

describe('resolveChartCeiling', () => {
  test('기록이 없으면 기본 상한을 쓴다', () => {
    expect(resolveChartCeiling('DAY', 0)).toBe(2_000);
    expect(resolveChartCeiling('WEEK', 0)).toBe(8_000);
    expect(resolveChartCeiling('MONTH', 0)).toBe(80_000);
  });

  test('보통 하루치(6,000보)는 기본 상한 안에 여유 있게 담긴다', () => {
    // 6,000 / 8,000 = 75%. 평범한 날 막대가 천장에 붙지 않아야 한다.
    expect(resolveChartCeiling('WEEK', 6_000)).toBe(8_000);
    expect(resolveChartCeiling('MONTH', 48_600)).toBe(80_000);
  });

  test('주간은 8.0k에 가까워지면 2,000씩 올라간다', () => {
    // 상한의 90%인 7,200까지는 8.0k를 유지한다.
    expect(resolveChartCeiling('WEEK', 7_200)).toBe(8_000);
    expect(resolveChartCeiling('WEEK', 7_300)).toBe(10_000);
    expect(resolveChartCeiling('WEEK', 9_500)).toBe(12_000);
  });

  test('일간은 500 단위로 올라간다', () => {
    expect(resolveChartCeiling('DAY', 1_700)).toBe(2_000);
    expect(resolveChartCeiling('DAY', 1_900)).toBe(2_500);
  });

  test('월간은 20,000 단위로 올라간다', () => {
    expect(resolveChartCeiling('MONTH', 75_000)).toBe(100_000);
  });

  test('상한은 항상 데이터 최댓값보다 크다', () => {
    // 상한이 데이터보다 작으면 가장 큰 막대가 천장을 뚫는다.
    const samples = [0, 1, 999, 5_600, 8_000, 48_600, 250_000];

    (['DAY', 'WEEK', 'MONTH'] as const).forEach(period => {
      samples.forEach(dataMax => {
        expect(resolveChartCeiling(period, dataMax)).toBeGreaterThan(dataMax);
      });
    });
  });

  test('눈금 4단으로 나누면 딱 떨어지는 값이 나온다', () => {
    // chart-kit은 라벨을 (상한 / 눈금수) * i 로 만든다.
    expect(resolveChartCeiling('MONTH', 48_600) / 4).toBe(20_000);
    expect(resolveChartCeiling('DAY', 1_700) / 4).toBe(500);
    expect(resolveChartCeiling('WEEK', 6_000) / 4).toBe(2_000);
  });
});

describe('maxValue', () => {
  test('가장 큰 값을 준다', () => {
    expect(maxValue([3, 9, 4])).toBe(9);
  });

  test('빈 배열은 0이다', () => {
    expect(maxValue([])).toBe(0);
  });
});

describe('buildHourlyChartData', () => {
  const hourlySteps = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    step: hour * 10,
  }));

  test('00시부터 23시까지 하루를 다 그린다', () => {
    const data = buildHourlyChartData(hourlySteps);

    // 새벽을 잘라내면 위에 뜨는 하루 합계(자정부터)와 곡선의 합이 어긋난다.
    expect(data).toHaveLength(24);
    expect(data[0].value).toBe(0);
    expect(data[data.length - 1].value).toBe(230);
  });

  test('라벨은 3시간마다만 달고 나머지는 비운다', () => {
    const data = buildHourlyChartData(hourlySteps);

    // 24개 점에 라벨을 다 달면 겹친다.
    expect(data.map(datum => datum.label).filter(Boolean)).toEqual([
      '00',
      '03',
      '06',
      '09',
      '12',
      '15',
      '18',
      '21',
    ]);
    expect(data[1].label).toBe('');
  });

  test('빈 입력이면 빈 배열이다', () => {
    expect(buildHourlyChartData([])).toEqual([]);
  });
});

describe('formatDuration', () => {
  test('분과 초로 나눈다', () => {
    expect(formatDuration(751)).toBe('12분 31초');
  });

  test('초가 딱 맞으면 초를 생략한다', () => {
    expect(formatDuration(120)).toBe('2분');
  });

  test('1분 미만은 초만 보여준다', () => {
    expect(formatDuration(31)).toBe('31초');
  });

  test('한 시간을 넘기면 초를 버린다', () => {
    expect(formatDuration(3_900)).toBe('1시간 5분');
    expect(formatDuration(7_200)).toBe('2시간');
  });
});

describe('formatWalkDateTime', () => {
  test('연월일과 요일, 시각을 붙인다', () => {
    expect(formatWalkDateTime('2026-07-20T20:00:00')).toBe(
      '2026.07.20 (월) 20:00',
    );
  });

  test('시각이 없으면 날짜만 보여준다', () => {
    expect(formatWalkDateTime('2026-07-20')).toBe('2026.07.20 (월)');
  });
});

describe('formatThousands', () => {
  test('세 자리마다 쉼표를 넣는다', () => {
    expect(formatThousands(36_000)).toBe('36,000');
    expect(formatThousands(0)).toBe('0');
    expect(formatThousands(100)).toBe('100');
  });
});


describe('buildHistoryResponse (삼성헬스 -> 화면)', () => {
  const week = { period: 'WEEK' as const, date: '2026-07-20' };

  test('구간의 모든 날짜를 채우고 없는 날은 0으로 둔다', () => {
    // SDK는 기록이 없는 날의 버킷을 아예 내려주지 않는다.
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-20', steps: 4_231, distanceMeters: 3_200, activeCalories: 176 },
      { date: '2026-07-23', steps: 6_000, distanceMeters: 4_500, activeCalories: 240 },
    ]);

    expect(response.startDate).toBe('2026-07-20');
    expect(response.endDate).toBe('2026-07-26');
    expect(response.histories).toHaveLength(7);
    expect(response.histories[0]).toEqual({
      historyDate: '2026-07-20',
      step: 4_231,
      distance: 3_200,
      calories: 176,
    });
    // 21일·22일은 SDK가 안 내려줬으므로 0.
    expect(response.histories[1].step).toBe(0);
    expect(response.histories[2].step).toBe(0);
    expect(response.histories[3].step).toBe(6_000);
  });

  test('합계는 채워진 배열을 더한 값이다', () => {
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-20', steps: 1_000, distanceMeters: 700, activeCalories: 40 },
      { date: '2026-07-21', steps: 2_000, distanceMeters: 1_400, activeCalories: 80 },
    ]);

    expect(response.totalStep).toBe(3_000);
    expect(response.totalDistance).toBe(2_100);
    expect(response.totalCalories).toBe(120);
  });

  test('SDK의 소수 값을 정수로 반올림한다', () => {
    // 서버·화면 모두 정수로 다루는데 SDK는 Float을 준다.
    const response = buildHistoryResponse('DAY', '2026-07-20', [
      { date: '2026-07-20', steps: 4_231, distanceMeters: 3_200.7, activeCalories: 176.4 },
    ]);

    expect(response.histories[0].distance).toBe(3_201);
    expect(response.histories[0].calories).toBe(176);
  });

  test('구간 밖 날짜는 무시한다', () => {
    const response = buildHistoryResponse(week.period, week.date, [
      { date: '2026-07-19', steps: 9_999, distanceMeters: 0, activeCalories: 0 },
    ]);

    expect(response.totalStep).toBe(0);
    expect(response.histories).toHaveLength(7);
  });

  test('기록이 하나도 없으면 전부 0이다', () => {
    const response = buildHistoryResponse(week.period, week.date, []);

    expect(response.totalStep).toBe(0);
    expect(response.histories).toHaveLength(7);
    expect(response.histories.every(day => day.step === 0)).toBe(true);
  });
});

describe('buildHourlySteps (삼성헬스 -> 화면)', () => {
  test('0~23시를 모두 만들고 없는 시간대는 0으로 둔다', () => {
    // 걸음이 없는 시간대는 버킷이 안 와서, 그대로 쓰면 x축에 구멍이 생긴다.
    const hourly = buildHourlySteps([
      { hour: 7, steps: 800 },
      { hour: 18, steps: 1_500 },
    ]);

    expect(hourly).toHaveLength(24);
    expect(hourly[0]).toEqual({ hour: 0, step: 0 });
    expect(hourly[7]).toEqual({ hour: 7, step: 800 });
    expect(hourly[18]).toEqual({ hour: 18, step: 1_500 });
    expect(hourly[23]).toEqual({ hour: 23, step: 0 });
  });

  test('시간이 뒤섞여 와도 시각 순서로 만든다', () => {
    const hourly = buildHourlySteps([
      { hour: 20, steps: 300 },
      { hour: 6, steps: 100 },
    ]);

    expect(hourly.map(entry => entry.hour)).toEqual(
      Array.from({ length: 24 }, (_, hour) => hour),
    );
    expect(hourly[6].step).toBe(100);
    expect(hourly[20].step).toBe(300);
  });

  test('빈 입력이면 종일 0이다', () => {
    const hourly = buildHourlySteps([]);

    expect(hourly).toHaveLength(24);
    expect(hourly.every(entry => entry.step === 0)).toBe(true);
  });
});

describe('buildMockWalkPage / buildMockRecentWalks', () => {
  test('최근 목록은 요청한 개수만 준다', () => {
    expect(buildMockRecentWalks(3)).toHaveLength(3);
  });

  test('최근 목록은 전체 목록의 앞부분과 같다', () => {
    // 두 목업이 어긋나면 전체 보기로 넘어갔을 때 앞 3개가 달라 보인다.
    const firstPage = buildMockWalkPage(0, 10, 'all', 'latest', null);

    expect(buildMockRecentWalks(3)).toEqual(firstPage.content.slice(0, 3));
  });

  test('가장 최근 산책이 맨 앞이다', () => {
    const { content } = buildMockWalkPage(0, 10, 'all', 'latest', null);
    const startedAts = content.map(walk => walk.startedAt);

    expect([...startedAts].sort().reverse()).toEqual(startedAts);
  });

  test('페이지를 넘기면 겹치지 않고 이어진다', () => {
    const first = buildMockWalkPage(0, 10, 'all', 'latest', null);
    const second = buildMockWalkPage(1, 10, 'all', 'latest', null);

    expect(first.content).toHaveLength(10);
    expect(second.content).toHaveLength(10);
    expect(first.hasNext).toBe(true);
    expect(second.hasNext).toBe(true);

    const ids = [...first.content, ...second.content].map(walk => walk.walkId);
    expect(new Set(ids).size).toBe(20);
  });

  test('마지막 페이지는 hasNext가 false다', () => {
    // 전체 27건이라 10개씩 세 번째 페이지에서 끝난다.
    const last = buildMockWalkPage(2, 10, 'all', 'latest', null);

    expect(last.content).toHaveLength(7);
    expect(last.hasNext).toBe(false);
  });

  test('범위를 넘은 페이지는 빈 목록이다', () => {
    expect(buildMockWalkPage(9, 10, 'all', 'latest', null)).toEqual({ content: [], hasNext: false });
  });

  test('같은 페이지를 다시 만들어도 같은 값이다', () => {
    expect(buildMockWalkPage(1, 10, 'all', 'latest', null)).toEqual(buildMockWalkPage(1, 10, 'all', 'latest', null));
  });
});

describe('selectWalks (필터 · 정렬)', () => {
  const walks = [
    {
      walkId: 1,
      title: '혼자',
      startedAt: '2026-07-18T20:00:00',
      step: 5_000,
      durationSeconds: 900,
      participants: [{ memberId: 101, nickname: '나' }],
    },
    {
      walkId: 2,
      title: '둘이',
      startedAt: '2026-07-20T20:00:00',
      step: 1_000,
      durationSeconds: 300,
      participants: [
        { memberId: 101, nickname: '나' },
        { memberId: 102, nickname: '민서' },
      ],
    },
    {
      walkId: 3,
      title: '셋이',
      startedAt: '2026-07-19T20:00:00',
      step: 9_000,
      durationSeconds: 1_800,
      participants: [
        { memberId: 101, nickname: '나' },
        { memberId: 102, nickname: '민서' },
        { memberId: 103, nickname: '지호' },
      ],
    },
  ];

  test('전체는 아무것도 걸러내지 않는다', () => {
    expect(selectWalks(walks, 'all', 'latest', null)).toHaveLength(3);
  });

  test('혼자는 참가자가 나 하나뿐인 산책만 남긴다', () => {
    expect(selectWalks(walks, 'solo', 'latest', null).map(w => w.walkId)).toEqual([1]);
  });

  test('함께는 참가자가 둘 이상인 산책만 남긴다', () => {
    expect(selectWalks(walks, 'group', 'latest', null).map(w => w.walkId)).toEqual([
      2, 3,
    ]);
  });

  test('최신순은 최근 산책이 먼저다', () => {
    expect(selectWalks(walks, 'all', 'latest', null).map(w => w.walkId)).toEqual([
      2, 3, 1,
    ]);
  });

  test('오래된순은 최신순의 역순이다', () => {
    expect(selectWalks(walks, 'all', 'oldest', null).map(w => w.walkId)).toEqual([
      1, 3, 2,
    ]);
  });

  test('걸음 많은순은 걸음 수로 내림차순 정렬한다', () => {
    expect(selectWalks(walks, 'all', 'mostSteps', null).map(w => w.walkId)).toEqual([
      3, 1, 2,
    ]);
  });

  test('원본 배열을 건드리지 않는다', () => {
    const before = walks.map(walk => walk.walkId);
    selectWalks(walks, 'all', 'mostSteps', null);

    expect(walks.map(walk => walk.walkId)).toEqual(before);
  });
});

describe('buildMockWalkPage (필터 · 정렬)', () => {
  test('필터를 페이지 자르기 전에 적용한다', () => {
    // 전체 27건 중 '함께'는 18건. 페이지마다 걸러내면 첫 페이지 원본 10건에서
    // 조건에 맞는 것만 남아 10개를 못 채운다. 먼저 걸러야 딱 10건이 담긴다.
    const first = buildMockWalkPage(0, 10, 'group', 'latest', null);

    expect(first.content.every(walk => walk.participants.length > 1)).toBe(true);
    expect(first.content).toHaveLength(10);
    expect(first.hasNext).toBe(true);

    const second = buildMockWalkPage(1, 10, 'group', 'latest', null);
    expect(second.content).toHaveLength(8);
    expect(second.hasNext).toBe(false);
  });

  test('필터를 걸면 전체보다 적어 페이지 수도 줄어든다', () => {
    // '혼자'는 9건뿐이라 한 페이지에서 끝난다.
    const solo = buildMockWalkPage(0, 10, 'solo', 'latest', null);

    expect(solo.content).toHaveLength(9);
    expect(solo.hasNext).toBe(false);
    expect(solo.content.every(walk => walk.participants.length === 1)).toBe(
      true,
    );
  });

  test('정렬을 바꾸면 첫 페이지의 첫 항목이 달라진다', () => {
    const latest = buildMockWalkPage(0, 10, 'all', 'latest', null);
    const oldest = buildMockWalkPage(0, 10, 'all', 'oldest', null);
    const mostSteps = buildMockWalkPage(0, 10, 'all', 'mostSteps', null);

    expect(oldest.content[0].walkId).not.toBe(latest.content[0].walkId);
    // 걸음 많은순의 맨 앞은 전체에서 가장 많이 걸은 산책이다.
    expect(mostSteps.content[0].step).toBeGreaterThanOrEqual(
      latest.content[0].step,
    );
  });

  test('정렬을 바꿔도 페이지들을 이어 붙이면 중복이 없다', () => {
    const first = buildMockWalkPage(0, 10, 'group', 'mostSteps', null);
    const second = buildMockWalkPage(1, 10, 'group', 'mostSteps', null);
    const ids = [...first.content, ...second.content].map(walk => walk.walkId);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveDateRange / formatDateRangeLabel', () => {
  const TODAY = '2026-07-26';

  test('전체 기간은 제한이 없다', () => {
    expect(resolveDateRange('all', TODAY)).toBeNull();
    expect(formatDateRangeLabel(null)).toBe('전체 기간');
  });

  test('최근 7일은 오늘을 포함해 7일이다', () => {
    // 7/20 ~ 7/26이 7일. 하루를 더 빼면 8일이 된다.
    expect(resolveDateRange('last7', TODAY)).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    });
  });

  test('최근 30일도 오늘을 포함한다', () => {
    expect(resolveDateRange('last30', TODAY)).toEqual({
      startDate: '2026-06-27',
      endDate: '2026-07-26',
    });
  });

  test('이번 달은 1일부터 오늘까지다', () => {
    // 아직 안 지난 날까지 넣을 이유가 없어 말일이 아니라 오늘로 끊는다.
    expect(resolveDateRange('thisMonth', TODAY)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-26',
    });
  });

  test('지난 달은 그 달 1일부터 말일까지다', () => {
    expect(resolveDateRange('lastMonth', TODAY)).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });
  });

  test('해를 넘는 지난 달도 맞게 잡는다', () => {
    expect(resolveDateRange('lastMonth', '2026-01-15')).toEqual({
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    });
  });

  test('라벨은 점으로 구분한 날짜 구간이다', () => {
    expect(
      formatDateRangeLabel({ startDate: '2026-07-01', endDate: '2026-07-26' }),
    ).toBe('2026.07.01 ~ 2026.07.26');
  });
});

describe('selectWalks 기간 필터', () => {
  const walks = [
    {
      walkId: 1,
      title: '7월 20일',
      startedAt: '2026-07-20T20:00:00',
      step: 1_000,
      durationSeconds: 100,
      participants: [{ memberId: 101, nickname: '나' }],
    },
    {
      walkId: 2,
      title: '7월 1일',
      startedAt: '2026-07-01T20:00:00',
      step: 1_000,
      durationSeconds: 100,
      participants: [{ memberId: 101, nickname: '나' }],
    },
    {
      walkId: 3,
      title: '6월 30일',
      startedAt: '2026-06-30T20:00:00',
      step: 1_000,
      durationSeconds: 100,
      participants: [{ memberId: 101, nickname: '나' }],
    },
  ];

  test('구간 안의 산책만 남긴다', () => {
    const selected = selectWalks(walks, 'all', 'latest', {
      startDate: '2026-07-01',
      endDate: '2026-07-26',
    });

    expect(selected.map(walk => walk.walkId)).toEqual([1, 2]);
  });

  test('구간 양 끝을 포함한다', () => {
    // 경계 날짜가 빠지면 '이번 달'에서 1일 기록이 사라진다.
    const selected = selectWalks(walks, 'all', 'latest', {
      startDate: '2026-07-01',
      endDate: '2026-07-01',
    });

    expect(selected.map(walk => walk.walkId)).toEqual([2]);
  });

  test('null이면 기간으로 걸러내지 않는다', () => {
    expect(selectWalks(walks, 'all', 'latest', null)).toHaveLength(3);
  });

  test('기간과 인원 필터를 함께 적용한다', () => {
    const selected = selectWalks(walks, 'group', 'latest', {
      startDate: '2026-07-01',
      endDate: '2026-07-26',
    });

    // 셋 다 혼자 산책이라 함께 필터에서는 아무것도 남지 않는다.
    expect(selected).toHaveLength(0);
  });
});

describe('resolveBarPercentage', () => {
  // chart-kit은 막대 폭을 `32 * barPercentage`로 계산한다.
  const barWidthOf = (percentage: number) => 32 * percentage;

  test('마지막 막대의 오른쪽 끝이 그림 영역 끝과 맞는다', () => {
    const plotWidth = 280;
    const barCount = 7;
    const barWidth = barWidthOf(resolveBarPercentage(plotWidth, barCount));
    const slot = plotWidth / barCount;

    // chart-kit이 막대를 놓는 위치: 칸 시작 + barWidth / 2.
    const lastBarRight = (barCount - 1) * slot + barWidth / 2 + barWidth;

    expect(lastBarRight).toBeCloseTo(plotWidth);
  });

  test('막대 수가 적으면 막대가 굵어진다', () => {
    const plotWidth = 280;

    // 월간(5칸)이 주간(7칸)보다 굵어야 칸을 같은 비율로 채운다.
    expect(barWidthOf(resolveBarPercentage(plotWidth, 5))).toBeGreaterThan(
      barWidthOf(resolveBarPercentage(plotWidth, 7)),
    );
  });

  test('차트가 넓어지면 막대도 같이 굵어진다', () => {
    // 고정 비율로 두면 넓은 화면에서 오른쪽이 비는 문제를 막는 성질.
    expect(barWidthOf(resolveBarPercentage(560, 7))).toBeCloseTo(
      barWidthOf(resolveBarPercentage(280, 7)) * 2,
    );
  });

  test('막대는 칸을 넘지 않는다', () => {
    const plotWidth = 280;

    [1, 5, 7, 18, 31].forEach(barCount => {
      const slot = plotWidth / barCount;
      const barWidth = barWidthOf(resolveBarPercentage(plotWidth, barCount));

      expect(barWidth).toBeLessThanOrEqual(slot);
    });
  });

  test('폭이나 개수가 0이면 안전한 기본값을 준다', () => {
    expect(resolveBarPercentage(0, 7)).toBe(1);
    expect(resolveBarPercentage(280, 0)).toBe(1);
  });

  test('막대는 칸의 오른쪽 BAR_SLOT_RATIO만큼을 차지한다', () => {
    const plotWidth = 280;
    const barCount = 7;
    const slot = plotWidth / barCount;
    const barWidth = barWidthOf(resolveBarPercentage(plotWidth, barCount));

    // 눌린 표시(ChartSegmentOverlay)를 이 비율로 앉히므로 어긋나면 표시가 밀린다.
    expect(barWidth / 2).toBeCloseTo(slot * (1 - BAR_SLOT_RATIO));
    expect(barWidth).toBeCloseTo(slot * BAR_SLOT_RATIO);
  });
});

describe('buildChartSegments', () => {
  const weekHistories = [
    { historyDate: '2026-07-20', step: 1_000, distance: 700, calories: 40 },
    { historyDate: '2026-07-21', step: 2_000, distance: 1_400, calories: 80 },
  ];

  test('주는 막대 하나가 하루를 가리킨다', () => {
    expect(buildChartSegments('WEEK', weekHistories, [])).toEqual([
      {
        index: 0,
        label: '7.20 (월)',
        dateRange: { startDate: '2026-07-20', endDate: '2026-07-20' },
        hourRange: null,
        step: 1_000,
        distance: 700,
        calories: 40,
      },
      {
        index: 1,
        label: '7.21 (화)',
        dateRange: { startDate: '2026-07-21', endDate: '2026-07-21' },
        hourRange: null,
        step: 2_000,
        distance: 1_400,
        calories: 80,
      },
    ]);
  });

  test('주 구간은 차트 막대와 개수·순서가 같다', () => {
    const chartData = buildStepChartData('WEEK', weekHistories, '2026-07-21');
    const segments = buildChartSegments('WEEK', weekHistories, []);

    // 탭 영역을 구간 수로 균등 분할하므로 개수가 어긋나면 누른 자리가 밀린다.
    expect(segments).toHaveLength(chartData.length);
    expect(segments.map(segment => segment.step)).toEqual(
      chartData.map(datum => datum.value),
    );
  });

  describe('월간', () => {
    const monthHistories = [
      { historyDate: '2026-07-01', step: 100, distance: 70, calories: 4 },
      { historyDate: '2026-07-07', step: 200, distance: 140, calories: 8 },
      { historyDate: '2026-07-08', step: 300, distance: 210, calories: 12 },
      { historyDate: '2026-07-31', step: 400, distance: 280, calories: 16 },
    ];

    test('막대 하나가 7일 묶음을 가리킨다', () => {
      const [firstBucket] = buildChartSegments('MONTH', monthHistories, []);

      expect(firstBucket).toEqual({
        index: 0,
        label: '7.1 (수) - 7.7 (화)',
        dateRange: { startDate: '2026-07-01', endDate: '2026-07-07' },
        hourRange: null,
        // 1일과 7일을 더한 값.
        step: 300,
        distance: 210,
        calories: 12,
      });
    });

    test('마지막 묶음은 말일에서 끊는다', () => {
      const segments = buildChartSegments('MONTH', monthHistories, []);
      const lastBucket = segments[segments.length - 1];

      // 5번째 묶음은 29일부터라 7일을 채우지 못한다.
      expect(lastBucket.dateRange).toEqual({
        startDate: '2026-07-29',
        endDate: '2026-07-31',
      });
      expect(lastBucket.label).toBe('7.29 (수) - 7.31 (금)');
    });

    test('구간은 차트 막대와 개수·순서가 같다', () => {
      const chartData = buildStepChartData(
        'MONTH',
        monthHistories,
        '2026-07-08',
      );
      const segments = buildChartSegments('MONTH', monthHistories, []);

      expect(segments).toHaveLength(chartData.length);
      expect(segments.map(segment => segment.step)).toEqual(
        chartData.map(datum => datum.value),
      );
    });
  });

  describe('일간', () => {
    const dayHistories = [
      { historyDate: '2026-07-20', step: 600, distance: 420, calories: 24 },
    ];
    const hourlySteps = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      step: hour < 6 ? 0 : 100,
    }));

    test('3시간씩 묶어 여덟 구간으로 나눈다', () => {
      const segments = buildChartSegments('DAY', dayHistories, hourlySteps);

      // 24개 시간대를 그대로 나누면 탭 영역이 손가락보다 좁아진다.
      expect(segments).toHaveLength(8);
      expect(segments.map(segment => segment.label)).toEqual([
        '00시 - 03시',
        '03시 - 06시',
        '06시 - 09시',
        '09시 - 12시',
        '12시 - 15시',
        '15시 - 18시',
        '18시 - 21시',
        '21시 - 24시',
      ]);
    });

    test('묶음 안 시간대의 걸음을 더한다', () => {
      const segments = buildChartSegments('DAY', dayHistories, hourlySteps);

      expect(segments[0].step).toBe(0);
      // 06·07·08시가 100씩.
      expect(segments[2]).toEqual({
        index: 2,
        label: '06시 - 09시',
        dateRange: { startDate: '2026-07-20', endDate: '2026-07-20' },
        hourRange: { startHour: 6, endHour: 9 },
        step: 300,
        // 시간대별로는 걸음만 읽을 수 있다.
        distance: null,
        calories: null,
      });
    });

    test('시간대 기록이 없으면 누를 구간도 없다', () => {
      // 차트를 못 그리는 상태라 탭 영역만 남으면 안 된다.
      expect(buildChartSegments('DAY', dayHistories, [])).toEqual([]);
    });
  });

  test('기록이 비어 있으면 구간이 없다', () => {
    expect(buildChartSegments('WEEK', [], [])).toEqual([]);
    expect(buildChartSegments('MONTH', [], [])).toEqual([]);
  });
});

describe('selectWalksInSegment', () => {
  const walks = [
    {
      walkId: 1,
      title: '아침',
      startedAt: '2026-07-20T07:30:00',
      step: 3_000,
      durationSeconds: 600,
      participants: [{ memberId: 101, nickname: '나' }],
    },
    {
      walkId: 2,
      title: '저녁',
      startedAt: '2026-07-20T20:10:00',
      step: 5_000,
      durationSeconds: 900,
      participants: [{ memberId: 101, nickname: '나' }],
    },
    {
      walkId: 3,
      title: '다음 날',
      startedAt: '2026-07-21T07:00:00',
      step: 1_000,
      durationSeconds: 300,
      participants: [{ memberId: 101, nickname: '나' }],
    },
  ];

  const daySegment = {
    index: 0,
    label: '7.20 (월)',
    dateRange: { startDate: '2026-07-20', endDate: '2026-07-20' },
    hourRange: null,
    step: 8_000,
    distance: 0,
    calories: 0,
  };

  test('구간 안에서 시작한 산책만 최신순으로 준다', () => {
    expect(
      selectWalksInSegment(walks, daySegment).map(walk => walk.walkId),
    ).toEqual([2, 1]);
  });

  test('시각 구간이 있으면 그 시간대에 시작한 산책만 남긴다', () => {
    const morning = {
      ...daySegment,
      label: '06시 - 09시',
      hourRange: { startHour: 6, endHour: 9 },
      distance: null,
      calories: null,
    };

    expect(
      selectWalksInSegment(walks, morning).map(walk => walk.walkId),
    ).toEqual([1]);
  });

  test('시각 구간의 끝 시각은 포함하지 않는다', () => {
    const beforeMorning = {
      ...daySegment,
      label: '03시 - 06시',
      hourRange: { startHour: 3, endHour: 6 },
      distance: null,
      calories: null,
    };

    // 07:30 산책이 06시 구간에 또 세어지면 합계가 두 번 잡힌다.
    expect(selectWalksInSegment(walks, beforeMorning)).toEqual([]);
  });

  test('7일 묶음은 그 안의 모든 날을 모은다', () => {
    const bucket = {
      ...daySegment,
      label: '7.15 (수) - 7.21 (화)',
      dateRange: { startDate: '2026-07-15', endDate: '2026-07-21' },
    };

    expect(
      selectWalksInSegment(walks, bucket).map(walk => walk.walkId),
    ).toEqual([3, 2, 1]);
  });
});

/**
 * @format
 */

import {
  formatThousands,
  formatWalkDate,
  formatWalkDateTime,
  formatWalkDuration,
} from '../src/features/history/model/format';
import {
  maxValue,
  resolveChartCeiling,
} from '../src/features/history/model/chartScale';
import { buildChartSegments } from '../src/features/history/model/chartSegments';
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
  toWalkDetail,
  toWalkRecord,
} from '../src/features/history/model/walkSession';
import type {
  WalkSessionBingoCellResponse,
  WalkSessionDetailResponse,
  WalkSessionResponse,
} from '../src/features/walk-session/api/walkSessionApi';
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

describe('formatWalkDateTime', () => {
  test('연월일과 요일, 시각을 붙인다', () => {
    // 서버는 Instant(UTC)를 준다. 11:00Z는 KST 20:00이다.
    expect(formatWalkDateTime('2026-07-20T11:00:00Z')).toBe(
      '2026.07.20 (월) 20:00',
    );
  });

  test('UTC 벽시계가 아니라 기기 시간대로 읽는다', () => {
    // 문자열을 쪼개면 '2026.07.20 (월) 15:30'으로 아홉 시간 어긋난다.
    expect(formatWalkDateTime('2026-07-20T15:30:00Z')).toBe(
      '2026.07.21 (화) 00:30',
    );
  });

  test('읽을 수 없는 값이면 빈 자리로 둔다', () => {
    expect(formatWalkDateTime('')).toBe('-');
  });
});

describe('formatWalkDate', () => {
  test('요일과 시각 없이 날짜만 보여준다', () => {
    // 목록 카드가 한 줄만 써서 길어지면 잘린다. 자세한 시각은 상세 화면에 있다.
    const label = formatWalkDate('2026-07-20T11:00:00Z');

    expect(label).toBe('2026.07.20');
    expect(label).not.toContain(':');
    expect(label).not.toContain('(');
  });

  test('시간대를 옮기면서 날짜가 넘어간다', () => {
    expect(formatWalkDate('2026-07-20T15:30:00Z')).toBe('2026.07.21');
  });
});

describe('formatWalkDuration', () => {
  test('한 시간이 안 되면 분만 적는다', () => {
    expect(formatWalkDuration(1_920)).toBe('32분');
    expect(formatWalkDuration(60)).toBe('1분');
  });

  test('한 시간이 넘으면 시간과 분을 나눠 적는다', () => {
    expect(formatWalkDuration(4_380)).toBe('1시간 13분');
  });

  test('딱 떨어지면 분을 붙이지 않는다', () => {
    expect(formatWalkDuration(7_200)).toBe('2시간');
  });

  test('1분이 안 되는 산책을 0분으로 두지 않는다', () => {
    // '0분'이면 기록이 비어 보인다.
    expect(formatWalkDuration(0)).toBe('1분 미만');
    expect(formatWalkDuration(59)).toBe('1분 미만');
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

const walkSessionResponse: WalkSessionResponse = {
  walkSessionId: 7,
  roomId: 12,
  roomName: '민서와의 산책',
  mode: 'COOPERATE',
  // 서버는 Instant(UTC)를 준다. KST로는 20:00에 시작해 20:32에 끝난 산책이다.
  startedAt: '2026-07-20T11:00:00Z',
  endedAt: '2026-07-20T11:32:00Z',
  durationSeconds: 1_920,
  activeDurationSeconds: 1_680,
  step: 3_240,
  distance: 2_400,
  calories: 118,
  initialBingoBoardId: 900,
  achievedMissionCount: 2,
};

function buildCells(
  boardSize: number,
  achieved: number[],
  approvedBefore: number[] = [],
): WalkSessionBingoCellResponse[] {
  return Array.from({ length: boardSize * boardSize }, (_, index) => {
    const achievedInSession = achieved.includes(index);
    const approved = achievedInSession || approvedBefore.includes(index);

    return {
      cellId: index + 1,
      row: Math.floor(index / boardSize),
      col: index % boardSize,
      mission: { missionId: index + 1, title: `미션 ${index}` },
      // 아무도 손대지 않은 칸은 서버가 상태를 null로 준다.
      verificationStatus: approved ? ('APPROVED' as const) : null,
      submittedByMemberId: approved ? 101 : null,
      achievedInSession,
      achievedAt: achievedInSession ? '2026-07-20T11:10:00Z' : null,
    };
  });
}

const detailResponse: WalkSessionDetailResponse = {
  ...walkSessionResponse,
  bingoBoards: [
    {
      bingoBoardId: 900,
      boardType: 'SHARED',
      boardSize: 3,
      cells: buildCells(3, [0, 3], [1, 8]),
    },
  ],
};

describe('toWalkRecord', () => {
  test('목록에 필요한 값으로 옮긴다', () => {
    const record = toWalkRecord(walkSessionResponse);

    // 상세 조회 키는 방(12)이 아니라 산책 한 번(7)이다.
    expect(record.walkSessionId).toBe(7);
    expect(record.title).toBe('민서와의 산책');
    expect(record.mode).toBe('COOPERATE');
    expect(record.step).toBe(3_240);
    expect(record.distanceMeters).toBe(2_400);
    expect(record.calories).toBe(118);
    expect(record.achievedMissionCount).toBe(2);
  });

  test('화면에 쓰는 시간은 일시정지를 뺀 쪽이다', () => {
    // durationSeconds(1920)에는 쉰 시간까지 들어 있어 실제 걸은 시간보다 길다.
    expect(toWalkRecord(walkSessionResponse).activeDurationSeconds).toBe(1_680);
  });
});

describe('toWalkDetail', () => {
  test('목록과 같은 값에 빙고판이 붙는다', () => {
    const detail = toWalkDetail(detailResponse);

    expect(detail.walkSessionId).toBe(7);
    expect(detail.step).toBe(3_240);
    expect(detail.bingoBoards).toHaveLength(1);
    expect(detail.bingoBoards[0].size).toBe(3);
  });

  test('칸 번호는 행·열로 매긴다', () => {
    const [board] = toWalkDetail(detailResponse).bingoBoards;

    expect(board.cells).toHaveLength(9);
    expect(board.cells.map(cell => cell.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  test('이번 산책에 깬 칸과 지난 산책에 깬 칸을 가른다', () => {
    const [board] = toWalkDetail(detailResponse).bingoBoards;

    // 판에는 승인된 칸이 넷이지만 이번 산책의 몫은 둘뿐이다.
    expect(board.cells.filter(cell => cell.achievedInSession)).toHaveLength(2);
    expect(board.cells.filter(cell => cell.completedBefore)).toHaveLength(2);
    expect(board.cells[0].achievedInSession).toBe(true);
    expect(board.cells[1].completedBefore).toBe(true);
  });

  test('이번 산책에 깬 칸을 지난 산책 몫으로 겹쳐 세지 않는다', () => {
    // 둘 다 참이 되면 범례의 칸 수 합이 판보다 커진다.
    const [board] = toWalkDetail(detailResponse).bingoBoards;

    expect(board.cells[0].completedBefore).toBe(false);
  });

  test('사진을 냈어도 승인 전이면 빈 칸이다', () => {
    const [board] = detailResponse.bingoBoards;
    const [submitted, ...rest] = board.cells;
    const detail = toWalkDetail({
      ...detailResponse,
      bingoBoards: [
        {
          ...board,
          cells: [
            {
              ...submitted,
              verificationStatus: 'PENDING' as const,
              achievedInSession: false,
              achievedAt: null,
            },
            ...rest,
          ],
        },
      ],
    });
    const [pending] = detail.bingoBoards[0].cells;

    expect(pending.achievedInSession).toBe(false);
    expect(pending.completedBefore).toBe(false);
  });

  test('산책 도중 판을 갈면 판이 여럿이다', () => {
    const detail = toWalkDetail({
      ...detailResponse,
      bingoBoards: [
        detailResponse.bingoBoards[0],
        {
          bingoBoardId: 901,
          boardType: 'PERSONAL' as const,
          boardSize: 4,
          cells: buildCells(4, [2]),
        },
      ],
    });

    expect(detail.bingoBoards.map(board => board.size)).toEqual([3, 4]);
    // 자리 번호는 판마다 그 판의 한 변을 기준으로 매겨야 한다.
    expect(detail.bingoBoards[1].cells).toHaveLength(16);
    expect(detail.bingoBoards[1].cells[7].index).toBe(7);
  });

  test('빙고판이 없으면 빈 배열이다', () => {
    // 미션을 하나도 못 깼고 시작한 판도 못 남긴 산책.
    const detail = toWalkDetail({ ...detailResponse, bingoBoards: [] });

    expect(detail.bingoBoards).toEqual([]);
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
        step: 1_000,
        distance: 700,
        calories: 40,
      },
      {
        index: 1,
        label: '7.21 (화)',
        dateRange: { startDate: '2026-07-21', endDate: '2026-07-21' },
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

describe('눌린 구간 표시 자리', () => {
  // chart-kit은 막대 폭을 `32 * barPercentage`로 계산한다.
  const barWidthOf = (percentage: number) => 32 * percentage;

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
